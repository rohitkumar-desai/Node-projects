import { AxiosError } from 'axios';
import Container, { Service } from 'typedi';
import { Builder } from 'builder-pattern';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { env } from '../../env';
import { FaxSendData, FaxTemplate } from '../models/FaxOutbound';
import { FileService } from './FileService';
import { PartnerClientService } from './PartnerServiceClient';
import { SrFaxClient } from './SrFaxClient';
import mustache from 'mustache';
import { UniteFaxService } from './UniteFaxService';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { FaxOutboundDetailRepo } from '../respositories/FaxOutbondDetailRepo';
import { FaxOutboundMapper } from '../mapper/FaxOutboundMapper';
import { FaxOutboundDetailEntity } from '../entities/FaxOutbondDetailEntity';
import { FaxProvider, ProcessingStatus } from '../models/FaxDetails';
import { FaxTemplateData } from '../models/FaxTemplateData';
import { FaxConfigType } from '../controllers/responses/PartnerFaxConfigResponse';
import { DocumentManagementServiceClient } from './DocumentManagementServiceClient';
import { RingCentralService } from './RingCentralService';
import { SrFaxPartnerResponse } from '../controllers/responses/SrFaxConfigurationResponse';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from 'routing-controllers';

@Service()
export class FaxOutboundV2Service {

    constructor(
        @Logger(__filename) private logger: LoggerInterface,
        @OrmRepository() private faxOutboundDetailRepo: FaxOutboundDetailRepo,
        private faxOutboundMapper: FaxOutboundMapper,
        private fileService: FileService,
        private partnerClientService: PartnerClientService,
        private documentClientService: DocumentManagementServiceClient,
    ) { }

    public async sendFax(faxData: FaxSendData, partnerId: number): Promise<void> {
        const srFaxClient = Container.get(SrFaxClient);
        const uniteFaxService = Container.get(UniteFaxService);
        const faxOutboundDetail = this.faxOutboundMapper.toFaxOutboundDetailEntity(faxData, partnerId);
        await this.faxOutboundDetailRepo.save(faxOutboundDetail);
        this.logger.info(`Received faxSendData as ${JSON.stringify(faxData)}`);
        if (faxData.faxTemplateType === FaxTemplate.REFERRAL_RECEIVED) {
            await this.referralReceived(partnerId, faxData)
        } else if (faxData.faxTemplateType === FaxTemplate.MISSING_ITEM) {
            await this.missingItem(partnerId, faxData)
        } else if (faxData.faxTemplateType === FaxTemplate.APPOINTMENT_BOOKING) {
            const fetchedHTMLFile = await this.getHtmlFileAsPerTemplate(faxData.faxTemplateType, partnerId);
            const dataRenderedPDF = await this.getDataRenderedPDF(fetchedHTMLFile, faxData);
            const partnerDetails = await this.partnerClientService.getPartnerDetail(partnerId);
            if (partnerDetails && partnerDetails.faxConfig && partnerDetails.faxConfig.inboxIntegrationType === 'SRFax') {
                if (partnerDetails.srFaxConfig.length) {
                    const activeSRFAXConfig = partnerDetails.srFaxConfig.filter(srFaxDetail =>
                        srFaxDetail.pullFax && srFaxDetail.isActive
                    );
                    srFaxClient.sendFax([dataRenderedPDF], activeSRFAXConfig[0], [faxData.recipientFaxNumber], faxData);
                }
            } else if (partnerDetails && partnerDetails.faxConfig && partnerDetails.faxConfig.inboxIntegrationType === 'Unite') {
                if (partnerDetails.uniteFaxConfig.length) {
                    const activeUniteFaxConfig = partnerDetails.uniteFaxConfig.filter(uniteFaxDetail =>
                        uniteFaxDetail.isActive
                    );
                    uniteFaxService.sendFax(dataRenderedPDF, activeUniteFaxConfig[0], [faxData.recipientFaxNumber], faxData);
                }
            } else {
                const srFaxConfig = Builder(SrFaxPartnerResponse)
                    .number(env.srFaxConfig.number)
                    .accountNumber(env.srFaxConfig.accountNumber)
                    .email(env.srFaxConfig.email)
                    .password(env.srFaxConfig.password)
                    .build();
                await srFaxClient.sendFax([dataRenderedPDF], srFaxConfig, [faxData.recipientFaxNumber], faxData);
            }
        } else {
            this.logger.warn(`${partnerId} | ${faxData.patientId} | There is no selected faxTemplateType`);
        }
    }

    public async updateFaxSendStatus(faxProvider: FaxProvider, faxStatus: ProcessingStatus, senderFaxNumber: string, faxData: FaxSendData, faxError?: string): Promise<void> {
        if (faxData && faxData.appointmentId || faxData.patientId) {
            const updatedOutboundFaxDetail = {} as FaxOutboundDetailEntity;
            updatedOutboundFaxDetail.faxProvider = faxProvider;
            updatedOutboundFaxDetail.faxSendError = faxError ? faxError : undefined;
            updatedOutboundFaxDetail.faxSendStatus = faxStatus;
            updatedOutboundFaxDetail.senderFaxNumber = senderFaxNumber;
            updatedOutboundFaxDetail.updatedAt = new Date();
            this.faxOutboundDetailRepo.createQueryBuilder('faxOutboundDetail')
                .update()
                .set(updatedOutboundFaxDetail)
                .where('appointmentId = :appointmentId', { appointmentId: faxData.appointmentId })
                .orWhere('patientId = :patientId', { patientId: faxData.patientId })
                .andWhere('recipientFaxNumber = :recipientFaxNumber', { recipientFaxNumber: faxData.recipientFaxNumber })
                .execute();
        }
    }

    private async getHtmlFileAsPerTemplate(faxTemplate: string, partnerId: number): Promise<any> {
        try {
            const bucketName = env.storageBucketConfig.bucketName;
            let gcpFilePath;
            if (faxTemplate === FaxTemplate.APPOINTMENT_BOOKING) {
                gcpFilePath = `${env.storageBucketConfig.faxTemplateFolderPath}/referral_booking.html`;
            }
            const templateFileBuffer = await this.fileService.getGcpFile(bucketName, gcpFilePath);
            const htmlData = Buffer.from(templateFileBuffer);
            return htmlData;
        } catch (err) {
            this.logger.error(`Error while generating Html file ${(err as AxiosError).message} for partnerId ${partnerId} and faxTemplate ${faxTemplate}`);
            throw new Error('Unable to generate the HTML file from Fax Template.');
        }
    }

    private async getDataRenderedPDF(htmlData: any, fileData: any): Promise<any> {
        const faxFileHtml = await mustache.render(htmlData.toString('utf8'), fileData);
        return await this.fileService.generatePdfFileBuffer(faxFileHtml);
    }

    // send fax for referral received
    public async referralReceived(partnerId: number, faxOutBound: FaxSendData): Promise<any> {
        const partnerDetail = await this.partnerClientService.getPartnerDetail(partnerId);
        const replaceData = Builder(FaxTemplateData)
            .patientName(faxOutBound.replaceData.patientName)
            .patientDOB(String(faxOutBound.replaceData.patientDOB))
            .hcn(faxOutBound.replaceData.hcn)
            .dateReferralReceived(faxOutBound.replaceData.dateReferralReceived)
            .clinicName(partnerDetail.fullName)
            .address(partnerDetail.contactDetail.emailAddress)
            .faxNumber(partnerDetail.contactDetail.faxNumber)
            .build();
        this.logger.info(`${partnerId} | replace data | ${JSON.stringify(replaceData)}`);
        try {
            const faxHtmlFile = await this.fileService.getHtmlFile(replaceData, env.storageBucketConfig.referralReceivedFaxTemplateFile);
            const faxPdfFileBuffer = await this.fileService.generatePdfFileBuffer(faxHtmlFile);
            await this.findConfigAndSendFax(partnerId, faxPdfFileBuffer, [String(faxOutBound.recipientFaxNumber)]);
            await this.documentClientService.saveFile(faxPdfFileBuffer, partnerId, String(faxOutBound.referralId), String(faxOutBound.patientId));
        } catch (error) {
            this.logger.error(`${partnerId} | ${faxOutBound.patientId} | Unable to generate and send the fax file ${(error as AxiosError).message}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `${(error as AxiosError).message}`);
        }
    }
    // send fax for referral missing items
    public async missingItem(partnerId: number, faxOutBound: FaxSendData): Promise<any> {
        const partnerDetail = await this.partnerClientService.getPartnerDetail(partnerId);
        const items = [];
        faxOutBound.replaceData.missingItems.filter((val) => {
            items.push({ 'items': val });
        });
        const replaceData = Builder(FaxTemplateData)
            .patientName(faxOutBound.replaceData.patientName)
            .patientDOB(String(faxOutBound.replaceData.patientDOB))
            .hcn(faxOutBound.replaceData.hcn)
            .dateReferralReceived(faxOutBound.replaceData.dateReferralReceived)
            .providerNote(faxOutBound.replaceData.providerNote)
            .missingItems(items)
            .clinicName(partnerDetail.fullName)
            .address(partnerDetail.contactDetail.emailAddress)
            .faxNumber(partnerDetail.contactDetail.faxNumber)
            .build();
        this.logger.info(`${partnerId} | missing items fax data | ${JSON.stringify(replaceData)}`);
        try {
            const faxHtmlFile = await this.fileService.getHtmlFile(replaceData, env.storageBucketConfig.missingItemFaxTemplateFile);
            const faxPdfFileBuffer = await this.fileService.generatePdfFileBuffer(faxHtmlFile);
            await this.findConfigAndSendFax(partnerId, faxPdfFileBuffer, [String(faxOutBound.recipientFaxNumber)], faxOutBound);
            await this.documentClientService.saveFile(faxPdfFileBuffer, partnerId, String(faxOutBound.referralId), String(faxOutBound.patientId));
        } catch (error) {
            this.logger.error(`${partnerId} | ${faxOutBound.patientId} | Unable to send missing items fax  ${(error as AxiosError).message}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `${(error as AxiosError).message}`);
        }
    }
    // TO find config and send fax
    public async findConfigAndSendFax(partnerId: number, file: any, faxNumbers: string[], faxData?: FaxSendData): Promise<any> {
        try {
            const partnerDetail = await this.partnerClientService.getPartnerDetail(partnerId);
            const srFaxClient = Container.get(SrFaxClient);
            if (partnerDetail.outgoingFaxId && partnerDetail.outgoingFaxType === FaxConfigType.SR_FAX) {
                const srFaxConfig = partnerDetail.srFaxConfig.find(item => Number(item.id) === Number(partnerDetail.outgoingFaxId));
                await srFaxClient.sendFax([file], srFaxConfig, faxNumbers, faxData);
            } else if (partnerDetail.outgoingFaxId && partnerDetail.outgoingFaxType === FaxConfigType.RING_CENTRAL) {
                const ringCentralConfig = partnerDetail.ringCentralConfig.find(item => Number(item.id) === Number(partnerDetail.outgoingFaxId));
                const ringCentralService = Container.get(RingCentralService);
                await ringCentralService.sendFax([file], faxNumbers, ringCentralConfig.ringCentralToken);
            } else if (partnerDetail.outgoingFaxId && partnerDetail.outgoingFaxType === FaxConfigType.UNITE_FAX) {
                const uniteFaxConfig = partnerDetail.uniteFaxConfig.find(item => Number(item.id) === Number(partnerDetail.outgoingFaxId));
                const uniteFaxService = Container.get(UniteFaxService);
                await uniteFaxService.sendFax(file, uniteFaxConfig, faxNumbers, faxData);
            } else {
                const srFaxConfig = Builder(SrFaxPartnerResponse)
                    .number(env.srFaxConfig.number)
                    .accountNumber(env.srFaxConfig.accountNumber)
                    .email(env.srFaxConfig.email)
                    .password(env.srFaxConfig.password)
                    .build();
                await srFaxClient.sendFax([file], srFaxConfig, faxNumbers, faxData);
            }
        } catch (error) {
            this.logger.error(`${partnerId} | ${faxNumbers.join()} | Error while send fax ${(error as AxiosError).message}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `Unable to send fax to number ${faxNumbers.join()}`);
        }
    }

}
