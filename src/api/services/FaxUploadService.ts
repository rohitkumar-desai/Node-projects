import { FaxDetailEntity } from './../entities/FaxDetailEntity';
import { Service } from 'typedi';
import { env } from '../../env';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { HttpError } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import { UploadInfo } from '../controllers/responses/DocumentResponse';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { producerService } from 'service-connector';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { FaxDetailRepo } from '../respositories/FaxDetailRepo';
import { SrFaxClient } from './SrFaxClient';
import axios from 'axios';
import { FaxDetail, ProcessingStatus, FaxUpdate, FaxUploadCallbackRequest } from '../models/FaxDetails';
import { FileService } from './FileService';
import { SaveFaxRequest } from '../controllers/requests/SaveFaxRequest';
import { Builder } from 'builder-pattern';
import { FaxTemplateData } from '../models/FaxTemplateData';
import { DocumentManagementServiceClient } from './DocumentManagementServiceClient';
import { FileProcessorServiceClient } from './FileProcessorServiceClient';
import { InboxFaxServiceClient } from './InboxFaxClientService';

@Service()
export class FaxUploadService {

    private blobStream: any;
    private url: any;

    constructor(
        @Logger(__filename) private logger: LoggerInterface,
        @OrmRepository() private faxDetailRepo: FaxDetailRepo,
        private srFaxClient: SrFaxClient,
        private fileService: FileService,
        private documentClientService: DocumentManagementServiceClient,
        private fileProcessorServiceClient: FileProcessorServiceClient,
        private inboxFaxService: InboxFaxServiceClient
    ) { }

    public async uploadFaxesFile(file: any, partnerId: number, id: string): Promise<UploadInfo> {
        if (file) {
            const fileType = file.mimetype.split('/').pop();
            this.logger.info(`fileType  `, fileType);
            const storage = new Storage();
            let extension: string;
            const newDocumentName = uuidv4();
            this.logger.info(`PDF DOCID :${newDocumentName}`);
            const bucket = storage.bucket(env.storageBucketConfig.bucketName);
            let newResult: UploadInfo;
            const obj = await this.findFaxbyid(partnerId, id);
            const documentEntity = new FaxDetailEntity();
            Object.assign(documentEntity, obj);
            switch (fileType) {
                case 'pdf':
                    extension = '.pdf';
                    this.blobStream = bucket.file(`files/partner_${partnerId}/faxes/${newDocumentName}.pdf`);
                    this.url = `https://storage.cloud.google.com/${env.storageBucketConfig.bucketName}/files/partner_${partnerId}/faxes/${newDocumentName}.pdf`;
                    this.logger.info(`extension pdf  `, this.url, extension);
                    documentEntity.pdfDocumentId = newDocumentName;
                    documentEntity.pdfDocumentName = newDocumentName + extension;
                    this.logger.info(`File Name  ${documentEntity.pdfDocumentName}`);
                    break;
                case 'tiff' || 'tif':
                    extension = '.tiff';
                    this.logger.info(`tiff  `);
                    this.blobStream = bucket.file(`files/partner_${partnerId}/faxes/${newDocumentName}.tif`);
                    this.url = `https://storage.cloud.google.com/${env.storageBucketConfig.bucketName}/files/partner_${partnerId}/faxes/${newDocumentName}.tif`;
                    this.logger.info(`extension Tiff  `, this.url, extension);
                    documentEntity.tifDocumentId = newDocumentName;
                    documentEntity.tifDocumentName = newDocumentName + extension;
                    this.logger.info(`File Name  ${documentEntity.tifDocumentName}`);
                    break;
                default:
                    this.logger.info(`default  `);
                    throw new HttpError(StatusCodes.NOT_ACCEPTABLE, `Wrong file format.Only PDF and TIFF Files allowed`);
                    break;
            }
            try {
                await this.srFaxClient.updateFax(documentEntity);
                this.logger.info(`Save file`, file.url);
                await this.blobStream.save(file.buffer);
                this.logger.info(`File saved successfully`);
                newResult = {
                    id: newDocumentName,
                    originalFileName: file.originalname,
                    url: this.url,
                };
                this.logger.info(`newResult  `, newResult);
                const faxNotificationData = {
                    partnerId,
                    id: newResult.id,
                    url: newResult.url,
                };
                this.logger.info(`Uploaded file to Server.`, faxNotificationData);
                this.FaxNotification(faxNotificationData);
                return newResult;
            } catch (error) {
                throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, (error as Error).message);
            }
        } else {
            throw new HttpError(StatusCodes.NOT_ACCEPTABLE, `File not selected. Please select PDF and TIFF Files`);
        }
    }

    public async FaxNotification(faxNotificationData: any): Promise<any> {
        try {
            this.logger.info(`Got Fax to process`);
            this.logger.info(
                `Data received for processing ${JSON.stringify(faxNotificationData)}`
            );
            const notificationDetail = JSON.stringify(faxNotificationData);
            this.logger.info(`Notifaction details `, notificationDetail);

            await producerService.sendData(
                notificationDetail,
                env.kafkaConfig.topic.split(',')[0]
            );
            this.logger.info(`File data is processed`);
        } catch (ex: any) {
            this.logger.info(`Error occured while processing data ${JSON.stringify(ex)}`);
            this.logger.warn(`${JSON.stringify(ex)}`);
        }
    }

    public async findFaxbyid(partnerId: number, id: string): Promise<FaxDetailEntity> {
        try {
            this.logger.info(`findFaxbyid `, partnerId);
            const obj: FaxDetailEntity = await this.faxDetailRepo.findOne({
                where: {
                    partnerId,
                    pdfDocumentId: id,
                },
            });
            return obj;
        } catch (error) {
            throw new HttpError(StatusCodes.BAD_REQUEST, `No Documents exists for partner id ${partnerId}`);
        }
    }

    public async faxUpload(file: any, partnerId: number, request: FaxUpdate): Promise<FaxDetailEntity> {
        let faxNotificationDataPdf;
        let faxNotificationDataTif;
        const documentEntity = new FaxDetailEntity();
        if (file) {
            const storage = new Storage();
            const bucket = storage.bucket(env.storageBucketConfig.bucketName);
            const fileType = file.mimetype.split('/').pop();
            this.logger.info(`fileType ConvertAndUPloadFile  `, fileType);
            switch (fileType) {
                case 'pdf':
                    const pdfFileName = uuidv4();
                    this.blobStream = bucket.file(`files/partner_${partnerId}/faxes/${pdfFileName}.pdf`);
                    this.logger.info(`Pdf file ID ${pdfFileName}`);
                    this.url = `${env.storageBucketConfig.googleBucketUrl}/${env.storageBucketConfig.bucketName}/files/partner_${partnerId}/faxes/${pdfFileName}.pdf`;
                    this.logger.info(`extensions after blobstream  `);
                    await this.blobStream.save(file.buffer);
                    this.logger.info(`New Fax saved successfully !  `);

                    faxNotificationDataPdf = {
                        partnerId,
                        id: pdfFileName,
                        url: this.url,
                    };

                    const respTiff = await this.srFaxClient.convertDocument(file);
                    this.logger.info(`respTiff ${JSON.stringify(respTiff)}`);
                    this.logger.info(`PDF TO TIFF Convert URL ${JSON.stringify(respTiff.documents[0].url)}`);
                    const tifFileName = uuidv4();
                    this.logger.info(`Tiff file ID ${tifFileName}`);
                    this.blobStream = bucket.file(`files/partner_${partnerId}/faxes/${tifFileName}.tif`);
                    this.url = `${env.storageBucketConfig.googleBucketUrl}/${env.storageBucketConfig.bucketName}/files/partner_${partnerId}/faxes/${tifFileName}.tif`;
                    const response = await axios.get(`${respTiff.documents[0].url}`, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(response.data, 'utf-8');
                    await this.blobStream.save(buffer);
                    faxNotificationDataTif = {
                        partnerId,
                        id: tifFileName,
                        url: this.url,
                    };

                    documentEntity.partnerId = partnerId;
                    documentEntity.pdfDocumentId = pdfFileName;
                    documentEntity.pdfDocumentName = pdfFileName + '.pdf';

                    documentEntity.tifDocumentId = tifFileName;
                    documentEntity.tifDocumentName = tifFileName + '.tif';
                    documentEntity.processingStatus = ProcessingStatus.PROCESSING;
                    documentEntity.pages = respTiff.pages;
                    documentEntity.fromFaxNumber = request.fromFaxNumber;
                    documentEntity.recipientFaxNumber = request.recipientFaxNumber;
                    documentEntity.createdAt = request.createdAt ? new Date(request.createdAt) : new Date();
                    documentEntity.faxCreatedAt = request.createdAt ? new Date(request.createdAt) : new Date();
                    this.logger.info(`documentEntity ${JSON.stringify(documentEntity)}`);

                    const faxDetail = await this.faxDetailRepo.save(documentEntity);
                    faxDetail.faxId = String(faxDetail.id);
                    await this.inboxFaxService.addFaxes([faxDetail], partnerId);

                    // kafka notification must be sent after saving the record in the database
                    this.FaxNotification(faxNotificationDataPdf);
                    this.FaxNotification(faxNotificationDataTif);
                    break;
                default:
                    this.logger.info(`default  `);
                    throw new HttpError(StatusCodes.NOT_ACCEPTABLE, `Wrong file format. Only PDF File allowed`);
            }

            return documentEntity;
        } else {
            throw new HttpError(StatusCodes.NOT_ACCEPTABLE, `File not selected. Please select PDF File`);
        }
    }

    public async faxUploadFromGcpUrl(partnerId: number, request: FaxUploadCallbackRequest): Promise<boolean> {
        const storage = new Storage();
        const bucket = storage.bucket(env.storageBucketConfig.bucketName);
        const fileRef = bucket.file(request.bucketFilePath);
        const fileStatus = await fileRef.exists();
        if (fileStatus[0] === false) {
            this.logger.error(`Did not find the document ${request.bucketFilePath}`);
            return false;
        }
        this.logger.info(`Documnet found ${request.bucketFilePath}. And Saved the data to document master.`);
        this.faxUploadFromGcpUrlBackground(partnerId, request);
        return true;
    }

    public async faxUploadFromGcpUrlBackground(partnerId: number, request: FaxUploadCallbackRequest): Promise<void> {
        let faxNotificationDataPdf;
        const documentEntity = new FaxDetailEntity();
        if (request.bucketFilePath !== undefined) {
            const storage = new Storage();
            const bucket = storage.bucket(env.storageBucketConfig.bucketName);
            const fileType = request.fileExtension;
            this.logger.info(`fileType ConvertAndUPloadFile  `, fileType);
            switch (fileType) {
                case 'pdf':
                    const pdfFileName = request.documentId;
                    this.logger.info(`Pdf file ID ${pdfFileName}`);
                    const url = request.fileUrl;
                    this.logger.info(`faxNotificationDataPdf ${url}`);
                    faxNotificationDataPdf = {
                        partnerId,
                        id: pdfFileName,
                        url,
                    };

                    const respTiff = await this.srFaxClient.convertDocumentFileUrl(request.fileUrl);
                    this.logger.info(`respTiff ${JSON.stringify(respTiff)}`);
                    this.logger.info(`PDF TO TIFF Convert URL ${JSON.stringify(respTiff.documents[0].url)}`);
                    const tifFileName = uuidv4();
                    this.logger.info(`Tiff file ID ${tifFileName}`);

                    const blobStream = bucket.file(`files/partner_${partnerId}/faxes/${tifFileName}.tif`);
                    const tifUrl = `https://storage.cloud.google.com/${env.storageBucketConfig.bucketName}/files/partner_${partnerId}/faxes/${tifFileName}.tif`;
                    const response = await axios.get(`${respTiff.documents[0].url}`, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(response.data, 'utf-8');
                    await blobStream.save(buffer);
                    this.logger.info(`tifUrl ${tifUrl}`);

                    documentEntity.partnerId = partnerId;
                    documentEntity.pdfDocumentId = pdfFileName;
                    documentEntity.pdfDocumentName = pdfFileName + '.pdf';

                    documentEntity.tifDocumentId = tifFileName;
                    documentEntity.tifDocumentName = tifFileName + '.tif';
                    documentEntity.processingStatus = ProcessingStatus.PROCESSING;
                    documentEntity.pages = respTiff.pages;
                    documentEntity.fromFaxNumber = request.fromFaxNumber;
                    documentEntity.recipientFaxNumber = request.recipientFaxNumber;
                    documentEntity.createdAt = new Date();
                    documentEntity.faxCreatedAt = new Date();
                    this.logger.info(`documentEntity ${JSON.stringify(documentEntity)} for partner ${partnerId}`);

                    const faxDetail = await this.faxDetailRepo.save(documentEntity);
                    this.logger.info(`Adding manually uploaded fax in Inbox service`);

                    faxDetail.faxId = String(faxDetail.id);
                    await this.inboxFaxService.addFaxes([faxDetail], partnerId);

                    await this.FaxNotification(faxNotificationDataPdf);
                    break;
                default:
                    this.logger.error(`Wrong file format. Only PDF File allowed`);
                    break;
            }
        }
    }

    public async updateFaxUploadProcessingStatus(partner: string, request: FaxDetail): Promise<void> {
        this.logger.info(`update faxUpload processing status partnerId ${partner} and request ${JSON.stringify(request)}`);
        const partnerId = Number(partner);
        const faxExist =
            await this.faxDetailRepo.findOne({ where: { pdfDocumentId: request.pdf_document_id, partnerId } });
        if (!faxExist) {
            this.logger.error(
                `Fax ${request.pdf_document_id} with partner ${partnerId}  doesn't exist`
            );
            throw new HttpError(
                StatusCodes.BAD_REQUEST,
                `Fax ${request.pdf_document_id} with partner ${partnerId}  doesn't exist`
            );
        }
        if (request.processingStatus) {
            faxExist.processingStatus = request.processingStatus;
        }
        if (request.processingError && request.processingError.length) {
            faxExist.processingError = request.processingError;
        }
        if (request.documentTypeConfidence) {
            faxExist.documentTypeConfidence = request.documentTypeConfidence;
        }
        if (request.documentType) {
            faxExist.documentType = request.documentType;
        }

        if (request.patientName) {
            faxExist.patientName = request.patientName;
        }

        if (request.priority) {
            faxExist.priority = request.priority;
        }

        if (request.fromUser) {
            faxExist.fromUser = request.fromUser;
        }

        if (request.patientMatchStatus) {
            faxExist.patientMatchStatus = request.patientMatchStatus;
        }

        if (request.ohip) {
            faxExist.ohip = request.ohip;
        }

        await this.faxDetailRepo.save(faxExist);
    }

    // To count number of Uploaded Faxes according to partner.
    public async getFaxCount(partnerId: number): Promise<number> {
        const faxes = await this.faxDetailRepo.count({ partnerId, isActive: true });
        if (!faxes) {
            this.logger.error(
                `Faxes with partner ${partnerId} doesn't exist`
            );
            throw new HttpError(
                StatusCodes.BAD_REQUEST,
                `Faxes with partner ${partnerId} doesn't exist`
            );
        }
        return faxes;
    }

    public async saveFax(saveFaxRequest: SaveFaxRequest, partnerId: number): Promise<any> {
        const faxFileHtml = await this.fileService.getHtmlFile(Builder(FaxTemplateData)
            .toName(saveFaxRequest.faxData.toName)
            .content(saveFaxRequest.faxData.content)
            .build(), env.storageBucketConfig.faxReportTemplatePath);
        this.logger.info('Fax file html', faxFileHtml);
        const faxFilePdfBuffer = await this.fileService.generatePdfFileBuffer(faxFileHtml);
        const clinicalReports = this.fileProcessorServiceClient.extractClinicalNoteFromReportPdf(faxFilePdfBuffer);
        this.logger.info(`Generated pdf from html for partner id ${partnerId}`);
        // this.logger.info(`Fax file pdf buffer: `, faxFilePdfBuffer);
        await this.documentClientService.saveFile(faxFilePdfBuffer, partnerId, saveFaxRequest.referralId,
            saveFaxRequest.patientId, await clinicalReports);
        this.logger.info(`saved fax for partner id -  ${partnerId} and referral id - ${saveFaxRequest.referralId}
        and patient id -  ${saveFaxRequest.patientId}`);
    }

}
