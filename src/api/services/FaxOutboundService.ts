import { AxiosError } from 'axios';
import { Builder } from 'builder-pattern';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from 'routing-controllers';
import { producerService } from 'service-connector';
import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { env } from '../../env';
import { DocumentServiceResponse } from '../controllers/responses/FaxOutboundResponse';
import { FaxConfigType } from '../controllers/responses/PartnerFaxConfigResponse';
import { FaxOutboundMapper } from '../mapper/FaxOutboundMapper';
import { FaxFileType, FaxOutbound, FaxOutboundExt, FaxOutboundForNoShow, FaxOutboundNotification, FaxOutboundV2, FaxSendReferral } from '../models/FaxOutbound';
import { FaxTemplateData } from '../models/FaxTemplateData';
import { InboundMessageStatus, InboxHL7Patch } from '../models/InboxMessage';
import { ReferralPatch } from '../models/ReferralDetail';
import { DocumentManagementServiceClient } from './DocumentManagementServiceClient';
import { FileProcessorServiceClient } from './FileProcessorServiceClient';
import { FileService } from './FileService';
import { InboxServiceClient } from './InboxServiceClient';
import { PartnerClientService } from './PartnerServiceClient';
import { ReferralServiceClient } from './ReferralServiceClient';
import { RingCentralService } from './RingCentralService';
import { SrFaxClient } from './SrFaxClient';
import { SrFaxPartnerResponse } from '../controllers/responses/SrFaxConfigurationResponse';
import { UniteFaxService } from './UniteFaxService';

@Service()
export class FaxOutboundService {

    constructor(
        @Logger(__filename) private logger: LoggerInterface,
        private fileService: FileService,
        private documentClientService: DocumentManagementServiceClient,
        private partnerClientService: PartnerClientService,
        private ringCentralService: RingCentralService,
        private srFaxClient: SrFaxClient,
        private faxOutboundMapper: FaxOutboundMapper,
        private inboxServiceClient: InboxServiceClient,
        private referralServiceClient: ReferralServiceClient,
        private fileProcessorServiceClient: FileProcessorServiceClient,
        private uniteFaxService: UniteFaxService
    ) { }

    public async sendOutboundFax(partnerId: number, faxOutBound: FaxOutbound): Promise<DocumentServiceResponse> {
        const faxSentNotificationData = Builder(FaxOutboundNotification)
            .appointmentId(faxOutBound.appointmentId)
            .patientId(faxOutBound.patientId)
            .providerId(faxOutBound.providerDetail.npi)
            .referralId(faxOutBound.referralId)
            .partnerId(partnerId)
            .build();

        try {
            // TODO: Update this as soon as the Fax Template is ready.
            const faxDataToSend = Builder(FaxTemplateData)
                .toName(faxOutBound.providerDetail.name)
                .content(faxOutBound.faxData.content)
                .providerId(faxOutBound.providerDetail.npi)
                .build();

            const faxFileHtml = await this.fileService.getHtmlFile(faxDataToSend, env.storageBucketConfig.faxReportTemplatePath);
            this.logger.info('Fax file html', faxFileHtml);
            const faxFilePdfBuffer = await this.fileService.generatePdfFileBuffer(faxFileHtml);
            const clinicalReports = this.fileProcessorServiceClient.extractClinicalNoteFromReportPdf(faxFilePdfBuffer);

            await this.sendFax(partnerId, [faxOutBound.providerDetail.faxNumber], [faxFilePdfBuffer]);

            await this.updateInboxMessageStatus(partnerId, Number(faxOutBound.referralId), InboundMessageStatus.REPORT_SENT);

            // De-activate the referral
            const referralPatch = Builder(ReferralPatch)
                .activeStatus(false)
                .patientId(Number(faxOutBound.patientId))
                .referralId(Number(faxOutBound.referralId))
                .build();
            await this.referralServiceClient.updateReferralStatus(partnerId, referralPatch);

            const savedFileResponse = await this.documentClientService.saveFile(faxFilePdfBuffer, partnerId, faxOutBound.referralId, faxOutBound.patientId, await clinicalReports);

            faxSentNotificationData.isFaxSent = true;
            faxSentNotificationData.docId = savedFileResponse.id;
            await this.faxSentNotification(faxSentNotificationData);

            return savedFileResponse;
        } catch (error) {
            this.logger.error('Unable to generate and send the fax file.');

            faxSentNotificationData.isFaxSent = false;
            await this.faxSentNotification(faxSentNotificationData);

            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, (error as Error).message);
        }
    }

    public async sendOutboundFaxExt(partnerId: number, faxOutBoundExt: FaxOutboundExt): Promise<void> {
        try {
            const files = [];
            await Promise.all(
                faxOutBoundExt.documents.map(async doc => {
                    try {
                        const buffer = await this.fileService.getDocumentFileBuffer(partnerId, doc.patientId, doc.documentId);
                        this.logger.info(`${partnerId} | Successfully fetched the pdf file buffer for the patient id: ${doc.patientId} and document id: ${doc.documentId}`);

                        files.push(buffer);
                    } catch (error) {
                        this.logger.warn(`${partnerId} | Unable to find the document id for the patient id: ${doc.patientId} and document id: ${doc.documentId}`);
                    }
                })
            );

            const faxNumbers = faxOutBoundExt.faxNumbers.map(p => p.toString());

            await this.sendFax(partnerId, faxNumbers, files);
        } catch (error) {
            this.logger.error(`${partnerId} | Unable to re-send the fax with error: ${JSON.stringify((error as Error).message)}`);

            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, (error as Error).message);
        }
    }

    public async sendOutboundFaxV2(partnerId: number, file: any, faxOutBound: FaxOutboundV2): Promise<any> {
        this.logger.info(`${partnerId} | Send outgoing fax v2`);

        const partnerFaxConfig = await this.partnerClientService.getPartnerFaxConfig(partnerId);

        if (FaxFileType.HTML === faxOutBound.fileType) {
            file = await this.fileService.generatePdfFileBuffer(file.buffer.toString());
        } else {
            file = file.buffer;
        }

        if (FaxConfigType.RING_CENTRAL === partnerFaxConfig.faxConfigType) {// Send ring central fax
            const sendFaxResult = await this.ringCentralService.sendFax([file], [faxOutBound.phoneNumber], partnerFaxConfig.ringCentralConfig.ringCentralToken);
            this.logger.info(`Ring Central Queue Fax Response: ${sendFaxResult}`);
        } else { // Send sr fax
            const sendFaxResult = await this.srFaxClient.sendFax([file], partnerFaxConfig.srFaxConfig, [faxOutBound.faxNumber]);
            this.logger.info(`SR Fax Queue Fax Response: ${sendFaxResult}`);
        }

        // Save file to patient id
        return await this.documentClientService.saveFile(file, partnerId, faxOutBound.referralId, faxOutBound.patientId);
    }
    // To send automated fax for the no show -reason
    public async sendOutboundFaxForNoShow(partnerId: number, faxOutBound: FaxOutboundForNoShow): Promise<DocumentServiceResponse> {
        const faxSentNotificationData = Builder(FaxOutboundNotification)
            .appointmentId(String(faxOutBound.appointmentDetail.id))
            .patientId(String(faxOutBound.patientDetail.patientId))
            .providerId(faxOutBound.appointmentDetail.providerNpi)
            .referralId(String(faxOutBound.appointmentDetail.referralId))
            .partnerId(partnerId)
            .build();

        try {
            const faxDataForNoShow = this.faxOutboundMapper.toAppointmentNoShowDto(faxOutBound);
            const faxFileHtml = await this.fileService.getHtmlFileForNoShow(faxDataForNoShow, partnerId);
            const faxFilePdfBuffer = await this.fileService.generatePdfFileBuffer(faxFileHtml);
            const srFaxConfig = await this.partnerClientService.getPartnerSrFaxConfig(partnerId);

            if (srFaxConfig && srFaxConfig[0].accountNumber && srFaxConfig[0].email && srFaxConfig[0].password) {
                await this.srFaxClient.sendFax([faxFilePdfBuffer], srFaxConfig[0], [faxDataForNoShow.fax_number]);
            }
            this.logger.info(`${partnerId} | Fax is sent to ${faxDataForNoShow.fax_number}`);
            const savedFileResponse = await this.documentClientService.saveFile(faxFilePdfBuffer, partnerId, String(faxOutBound.appointmentDetail.referralId), String(faxOutBound.appointmentDetail.patientId));
            faxSentNotificationData.isFaxSent = true;
            faxSentNotificationData.docId = savedFileResponse.id;
            this.faxSentNotification(faxSentNotificationData);

            return savedFileResponse;
        } catch (error) {
            this.logger.error(`${partnerId} | Unable to generate and send the fax file.`);

            faxSentNotificationData.isFaxSent = false;
            this.faxSentNotification(faxSentNotificationData);

            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `${(error as AxiosError).message}`);
        }
    }

    /**
     * Notify all the subscribers when a fax report is successfully sent.
     *
     * @param faxOutboundNotification data to send
     */
    public async faxSentNotification(faxOutboundNotification: FaxOutboundNotification): Promise<any> {
        try {
            const faxOutboundNotificationJson = JSON.stringify(faxOutboundNotification);

            await producerService.sendData(
                faxOutboundNotificationJson,
                env.kafkaConfig.reportSentNotification
            );
        } catch (ex: any) {
            this.logger.error(`Error occured while sending notification for Fax Sent ${JSON.stringify(ex)}`);
            throw Error(`Unable to send notification for Fax Sent.`);
        }
    }

    /**
     * Fetch the related inbox message and update its status
     *
     * @param partnerId
     * @param referralId
     */
    public async updateInboxMessageStatus(partnerId: number, referralId: number, messageStatus: InboundMessageStatus): Promise<any> {
        try {
            // Fetch the inbox message
            const inboxMessageResponse = await this.inboxServiceClient.getByReferralId(partnerId, referralId);
            if (inboxMessageResponse === undefined || inboxMessageResponse.data.length === 0) {
                throw new Error(`No Inbox Message found for the given partnerId: ${partnerId} and referralId: ${referralId}`);
            }

            // Update the message status
            const inboxStatusUpdatePatch = Builder(InboxHL7Patch)
                .inboxMessageStatus(messageStatus)
                .uuid(inboxMessageResponse.data[0].uuid)
                .build();
            await this.inboxServiceClient.updateHl7Status(partnerId, inboxStatusUpdatePatch);

            this.logger.info(`Inbox Message Status successfully updated.`);
        } catch (ex: any) {
            this.logger.error(`Unable to update the inbox message status for referal id: ${referralId} and partnerId: ${partnerId}, Error: ${JSON.stringify((ex as Error).message)}`);
            throw Error(`Unable to update the inbox message status.`);
        }
    }

    public async referralDeclined(partnerId: number, faxOutBound: FaxSendReferral): Promise<DocumentServiceResponse> {
        this.logger.info(`Processing request for PartnerId ${partnerId} and faxOutbound object ${JSON.stringify(faxOutBound)}`);
        const partnerDetail = await this.partnerClientService.getPartnerDetail(partnerId);

        const replaceData = Builder(FaxTemplateData)
            .patientName(faxOutBound.replaceData.patientName)
            .patientDOB(String(faxOutBound.replaceData.patientDOB))
            .hcn(faxOutBound.replaceData.hcn)
            .physicianName(faxOutBound.replaceData.physicianName)
            .reason(faxOutBound.replaceData.reason)
            .dateReferralReceived(faxOutBound.replaceData.dateReferralReceived)
            .clinicName(partnerDetail.fullName)
            .address(partnerDetail.contactDetail.emailAddress)
            .faxNumber(partnerDetail.contactDetail.faxNumber)
            .build();
        try {
            const faxHtmlFile = await this.fileService.getHtmlFile(replaceData, env.storageBucketConfig.referralDeclineFaxTemplateFile);
            const faxPdfFileBuffer = await this.fileService.generatePdfFileBuffer(faxHtmlFile);
            await this.findConfigAndSendFax(partnerId, faxPdfFileBuffer, [String(faxOutBound.toFaxNumber)]);
            return await this.documentClientService.saveFile(faxPdfFileBuffer, partnerId, String(faxOutBound.referralId), String(faxOutBound.patientId));
        } catch (error) {
            this.logger.error(`Unable to generate and send the fax file ${(error as AxiosError).message}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `${(error as AxiosError).message}`);
        }
    }
    // TO find config and send fax
    public async findConfigAndSendFax(partnerId: number, file: any, faxNumbers: string[]): Promise<any> {
        try {
            const partnerDetail = await this.partnerClientService.getPartnerDetail(partnerId);
            if (partnerDetail.outgoingFaxId && partnerDetail.outgoingFaxType === FaxConfigType.SR_FAX) {
                const srFaxConfig = partnerDetail.srFaxConfig.find(item => Number(item.id) === Number(partnerDetail.outgoingFaxId));
                await this.srFaxClient.sendFax([file], srFaxConfig, faxNumbers);
            } else if (partnerDetail.outgoingFaxId && partnerDetail.outgoingFaxType === FaxConfigType.RING_CENTRAL) {
                const ringCentralConfig = partnerDetail.ringCentralConfig.find(item => Number(item.id) === Number(partnerDetail.outgoingFaxId));
                await this.ringCentralService.sendFax([file], faxNumbers, ringCentralConfig.ringCentralToken);
            } else if (partnerDetail.outgoingFaxId && partnerDetail.outgoingFaxType === FaxConfigType.UNITE_FAX) {
                const uniteFaxConfig = partnerDetail.uniteFaxConfig.find(item => Number(item.id) === Number(partnerDetail.outgoingFaxId));
                await this.uniteFaxService.sendFax(file, uniteFaxConfig, faxNumbers);
            } else {
                const srFaxConfig = Builder(SrFaxPartnerResponse)
                    .number(env.srFaxConfig.number)
                    .accountNumber(env.srFaxConfig.accountNumber)
                    .email(env.srFaxConfig.email)
                    .password(env.srFaxConfig.password)
                    .build();
                await this.srFaxClient.sendFax([file], srFaxConfig, faxNumbers);
            }
        } catch (error) {
            this.logger.error(`${partnerId} | ${faxNumbers.join()} | Error while send fax ${(error as AxiosError).message}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `Unable to send fax to number ${faxNumbers.join()}`);
        }
    }

    private async sendFax(partnerId: number, faxNumbers: string[], faxFilePdfBuffers: any[]): Promise<void> {
        const partnerRingCentralConfig = await this.partnerClientService.getPartnerRingCentralConfig(partnerId);

        // If Ring Central Config present send fax via Ring Central
        if (partnerRingCentralConfig.ringCentralClientId && partnerRingCentralConfig.ringCentralToken && partnerRingCentralConfig.ringCentralRefreshToken) {
            this.logger.info(`Ring Central Config present for Partner ${partnerId}`);

            if (faxNumbers !== undefined && faxNumbers.length > 0) {
                this.logger.info(`Sending Fax to Provider with fax numbers ${faxNumbers}`);

                const sendFaxResult = await this.ringCentralService.sendFax(faxFilePdfBuffers, faxNumbers, partnerRingCentralConfig.ringCentralToken);
                this.logger.info('Queue Fax Response: ', sendFaxResult);
            } else {
                this.logger.error(`No valid fax number found: ${faxNumbers}`);
                throw new Error(`No valid fax number found : ${faxNumbers}`);
            }

        } else { // Else Send it out via Sr Fax
            const srFaxConfig = await this.partnerClientService.getPartnerSrFaxConfig(partnerId);
            this.logger.info(`The srfax config retreived.`, srFaxConfig);

            if (srFaxConfig && srFaxConfig.accountNumber && srFaxConfig.email && srFaxConfig.password) {

                if (faxNumbers !== undefined && faxNumbers.length > 0) {
                    this.logger.info(`Sending Fax to Provider with fax numbers ${faxNumbers}`);

                    const sendFaxResult = await this.srFaxClient.sendFax(faxFilePdfBuffers, srFaxConfig, faxNumbers);
                    this.logger.info(`Queue Fax Response ${JSON.stringify(sendFaxResult)} for faxNumbers ${faxNumbers} partnerId ${partnerId}`);
                } else {
                    this.logger.error(`No valid fax number found: ${faxNumbers}`);
                    throw new Error(`No valid fax number found: ${faxNumbers}`);
                }
            } else {
                this.logger.error(`No valid fax config present for ${partnerId}`);
                throw new Error(`No valid fax config present for partner Id : ${partnerId}`);
            }
        }
    }


}
