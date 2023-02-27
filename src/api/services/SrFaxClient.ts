import { Storage } from '@google-cloud/storage';
import axios from 'axios';
import { Builder } from 'builder-pattern';
import { SrFaxConfigurationResponse, SrFaxPartnerResponse } from './../controllers/responses/SrFaxConfigurationResponse';
import { Service } from 'typedi';
import { SrFaxConfig } from '../controllers/requests/SrFaxConfig';
import { FaxDetailRepo } from '../respositories/FaxDetailRepo';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { FaxDetailEntity } from '../entities/FaxDetailEntity';
import { HttpError } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import FormData from 'form-data';
import * as https from 'https';
import { producerService } from 'service-connector';
import { Duplex } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../env';
import { UploadInfo } from '../controllers/responses/DocumentResponse';
import moment from 'moment-timezone';
import { FaxSendData } from '../models/FaxOutbound';
import { FaxProvider, ProcessingStatus } from '../models/FaxDetails';
import { FaxOutboundV2Service } from './FaxOutboundV2Service';
@Service()
export class SrFaxClient {

    private blobStream: any;
    private url: any;

    constructor(
        @OrmRepository() private faxDetailRepo: FaxDetailRepo,
        @Logger(__filename) private logger: LoggerInterface,
        private faxOutboundV2Service: FaxOutboundV2Service) { }

    public async fetchFaxDetails(body: SrFaxConfig): Promise<SrFaxConfigurationResponse[]> {
        this.logger.info(`fetchFaxDetails Client`);
        const response = await axios.post(`${env.serviceMesh.srconfig.baseUrl}`, body);
        return response.data.Result;
    }

    public async retrieveFaxDetails(body: SrFaxConfig): Promise<any> {
        try {
            const response = await axios.post(`${env.serviceMesh.srconfig.baseUrl}`, body);
            this.logger.info(`Response of retrive fax ${response.data}`);
            return response.data.Result;
        } catch (err) {
            this.logger.error(`Error In fax API ${(err as Error).message}`);
        }
    }

    // Save fax data/file into GCS bucket
    public async saveFileIntoBucket(file: any, partnerId: number, extension: string): Promise<any> {
        let newResult: UploadInfo;
        const base64EncodedString = file.replace(/^data:\w+\/\w+;base64,/, '');
        const fileBuffer = Buffer.from(base64EncodedString, 'base64');
        const newDocumentName = uuidv4();
        this.logger.info(`saveFaxes into GCS clients docID :  ${newDocumentName}`);

        const storage = new Storage();
        const bucket = storage.bucket(env.storageBucketConfig.bucketName);
        this.logger.info(`Extension of file :  ${extension}`);

        this.logger.info('Case PDF');
        this.blobStream = bucket.file(`files/partner_${partnerId}/faxes/${newDocumentName}${extension}`);
        this.url = `${env.storageBucketConfig.googleBucketUrl}/${env.storageBucketConfig.bucketName}/files/partner_${partnerId}/faxes/${newDocumentName}${extension}`;
        this.logger.info(`extensions after blobstream  `, this.url, extension);

        await this.blobStream.save(fileBuffer);
        this.logger.info(`${extension} File saved successfully`);

        newResult = {
            id: newDocumentName,
            originalFileName: newDocumentName + extension,
            url: `https://storage.cloud.google.com/${env.storageBucketConfig.bucketName}/files/partner_${partnerId}/faxes/${newDocumentName}${extension}`,
        };
        if (extension === '.pdf') {
            const faxNotificationData = {
                partnerId,
                id: newResult.id,
                url: newResult.url,
            };
            this.logger.info(`Uploaded file to Server.`, faxNotificationData);
            this.faxFileNotification(faxNotificationData);
        }
        return newResult;
    }

    public async faxFileNotification(faxNotificationData: any): Promise<any> {
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

    public async saveFaxes(faxDetail: FaxDetailEntity): Promise<FaxDetailEntity> {
        try {
            const result: FaxDetailEntity = await this.faxDetailRepo.save(faxDetail);
            this.logger.debug(`Fax saved successfully in DB for data ${JSON.stringify(faxDetail)} in Fax service, now updating in Inbox service`);
            return result;
        } catch (err) {
            this.logger.warn(`Got error while saving data in fax DB and syncing faxes to Inbox service as ${JSON.stringify(err)} for data ${JSON.stringify(faxDetail)}}`);
            return undefined;
        }
    }

    public async updateFax(data: any): Promise<FaxDetailEntity> {
        this.logger.info(`updateFax clients  :  ${JSON.stringify(data)}`);
        const result: any = await this.faxDetailRepo.save(data);
        return result;
    }

    public async findAllFaxByID(partnerId: number): Promise<FaxDetailEntity> {
        try {
            this.logger.info(`FindAllDocuments service `, partnerId);
            return await this.faxDetailRepo.findOne({
                where: { partnerId: { $eq: partnerId } },
            });
        } catch (error) {
            throw new HttpError(StatusCodes.BAD_REQUEST, `No Documents exists for partner id ${partnerId}`);
        }
    }

    public async convertDocument(file: any): Promise<any> {
        const fileObject = new Duplex();
        fileObject.push(file.buffer);
        fileObject.push(null);
        const data = new FormData();
        data.append('file', fileObject, file.originalname);
        const agent = new https.Agent({
            rejectUnauthorized: true,
        });
        const url = `${env.serviceMesh.fileProcesing.baseUrl}/convert_to_tiff`;
        this.logger.info(`Url for document conversion : ${url}`);
        try {
            const response = await axios({
                method: 'post',
                url,
                data,
                httpsAgent: agent,
                headers: {
                    ...data.getHeaders(),
                },
            });
            return response.data;
        } catch (error) {
            throw new HttpError(StatusCodes.BAD_REQUEST, `Error in converting file`);
        }
    }

    public async convertDocumentFileUrl(file_url: string): Promise<any> {
        const data = new FormData();
        data.append('file_url', file_url);
        const agent = new https.Agent({
            rejectUnauthorized: true,
        });

        const url = `${env.serviceMesh.fileProcesing.baseUrl}/convert_to_tiff`;
        this.logger.info(`Url for document conversion ${url}`);
        try {
            const response = await axios({
                method: 'post',
                url,
                data,
                httpsAgent: agent,
                headers: {
                    ...data.getHeaders(),
                },
            });
            return response.data;
        } catch (error) {
            throw new HttpError(StatusCodes.BAD_REQUEST, `Error in converting file`);
        }
    }

    public async sendFax(files: any[], srFaxConfig: SrFaxPartnerResponse, faxNumbers: string[], faxData?: FaxSendData): Promise<any> {
        try {
            if (faxNumbers !== undefined && faxNumbers.length > 0) {
                faxNumbers.forEach((faxNumber, index) => {
                    faxNumbers[index] = faxNumber.length === 10 ? `1${faxNumber}` : faxNumber;
                })
                this.logger.info(`Queuing Fax for Fax Numbers ${faxNumbers}`);
                const data = new FormData();
                data.append('action', 'Queue_Fax');
                data.append('access_id', srFaxConfig.accountNumber);
                data.append('access_pwd', srFaxConfig.password);
                data.append('sCallerID', srFaxConfig.number);
                data.append('sSenderEmail', srFaxConfig.email);
                data.append('sFaxType', 'SINGLE');
                data.append('sToFaxNumber', faxNumbers.join('|'));
                this.logger.info(`Request data ${JSON.stringify(data)}`);
                files.forEach((file, index) => {
                    const fileCount = index + 1;
                    const fileName = uuidv4() + '.pdf';
                    data.append(`sFileName_${fileCount}`, fileName);
                    data.append(`sFileContent_${fileCount}`, file.toString('base64'));
                });
                const response = await axios({
                    method: 'post',
                    url: `${env.serviceMesh.srconfig.baseUrl}`,
                    data: data,
                    headers: {
                        ...data.getHeaders(),
                        'Content-Length': data.getLengthSync(),
                    },
                });
                this.logger.info(`Successful response: ${JSON.stringify(response.data)} from SRFax `);
                if (faxData) {
                    this.faxOutboundV2Service.updateFaxSendStatus(FaxProvider.SRFAX, ProcessingStatus.SUCCESS, srFaxConfig.number, faxData);
                }
                return response.data.Result;
            } else {
                this.logger.error(`No Fax Number Present for the Provider`);
                throw new Error(`No Fax Number Present for the Provider`);
            }
        } catch (error) {
            this.logger.error(`Error while sending fax with SR Fax: ${error}`);
            if (faxData) {
                this.faxOutboundV2Service.updateFaxSendStatus(FaxProvider.SRFAX, ProcessingStatus.FAIL, srFaxConfig.number, faxData, `${JSON.stringify(error)}`);
            }
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `Unable to send fax to the providers with fax numbers ${faxNumbers}`);
        }
    }

    // Store fax values into GCS-bucket and in DB
    public async processSRFaxDetails(obj: SrFaxConfigurationResponse, srfaxconfig: any, partnerId: number, syncId: string, partnerTimeZone: string): Promise<FaxDetailEntity> {
        try {
            const myArray = obj.FileName.split('|');
            const retrieveFile = Builder(SrFaxConfig).action('Retrieve_Fax').access_id(srfaxconfig.accountNumber).access_pwd(srfaxconfig.password)
                .sFaxFileName(obj.FileName).sDirection('IN').sFaxDetailsID(myArray[1]).build();

            const pdfFile = await this.retrieveFaxDetails(retrieveFile);

            this.logger.info(`Able to retrieve file from srfax for partner ${partnerId}`);
            const pdfExtension = '.pdf';
            const fileResponse = await this.saveFileIntoBucket(pdfFile, partnerId, pdfExtension);
            this.logger.info(`PDF File Response: ${JSON.stringify(fileResponse)} for partner ${partnerId}`);
            this.logger.info(`Response Obj: ${JSON.stringify(obj)} for partner ${partnerId}`);
            const faxDetailEntity = await this.saveFaxDetails(partnerId, obj, fileResponse, pdfExtension, syncId, partnerTimeZone);
            this.logger.info(`Data of fax entity : ${JSON.stringify(faxDetailEntity)} for partner ${partnerId}`);

            const retrieveTiffFile = Builder(SrFaxConfig).action('Retrieve_Fax').access_id(srfaxconfig.accountNumber).access_pwd(srfaxconfig.password)
                .sFaxFileName(obj.FileName).sDirection('IN').sFaxDetailsID(myArray[1]).sFaxFormat('TIFF').build();
            const TiffFile = await this.retrieveFaxDetails(retrieveTiffFile);
            this.logger.info(`Able to receive Tiff file for partner ${partnerId}`);
            const tifExtension = '.tif';
            const tiffFileResponse = await this.saveFileIntoBucket(TiffFile, partnerId, tifExtension);

            this.logger.info(`fax saved data for pdf-Id: ${JSON.stringify(faxDetailEntity)} for partner ${partnerId}`);
            const documentEntity = new FaxDetailEntity();
            Object.assign(documentEntity, faxDetailEntity);

            documentEntity.tifDocumentId = tiffFileResponse.id;
            documentEntity.tifDocumentName = tiffFileResponse.originalFileName;
            const updateFax = await this.saveFaxes(documentEntity);
            this.logger.info(`Updated Fax with DocID's: ${JSON.stringify(updateFax)} for partner ${partnerId}`);
            return updateFax;
        } catch (err) {
            throw new HttpError(StatusCodes.BAD_REQUEST, (err as Error).message);
        }
    }

    // Save fax data into DB
    public async saveFaxDetails(partnerId: number, data: SrFaxConfigurationResponse, fileResponse: UploadInfo, extension: string, syncId: string, partnerTimeZone: string): Promise<FaxDetailEntity> {
        try {
            const documentEntity = new FaxDetailEntity();
            this.logger.info(`In save-fax-details function [data] is  :  ${JSON.stringify(data)}`);
            Object.assign(documentEntity, data);
            this.logger.info(`documentEntity  :  ${JSON.stringify(documentEntity)}`);
            this.logger.info(`Extension ${extension}`);
            switch (extension) {
                case '.pdf':
                    this.logger.info(`.pdf file to save`);
                    documentEntity.pdfDocumentId = fileResponse.id;
                    documentEntity.pdfDocumentName = fileResponse.originalFileName;
                    break;
                case '.tif':
                    this.logger.info(`.tiff file to save`);
                    documentEntity.tifDocumentId = fileResponse.id;
                    documentEntity.tifDocumentName = fileResponse.originalFileName;
                    break;
                default:
                    this.logger.info(`default`);
                    throw new HttpError(StatusCodes.NOT_ACCEPTABLE, `Wrong file format.Only PDF and TIFF Files allowed`);
                    break;
            }
            documentEntity.partnerId = partnerId;
            documentEntity.faxId = 'SRFAX_' + data.FileName.split('|')[0];
            documentEntity.fromFaxNumber = data.CallerID;
            documentEntity.recipientFaxNumber = data.CallerID;
            const faxCreateTime = moment(data.Date).utc().toISOString();
            const faxCreateTimePartner = moment(faxCreateTime).tz(partnerTimeZone, true);
            documentEntity.faxCreatedAt = new Date(faxCreateTimePartner.utc().format());
            documentEntity.pages = data.Pages;
            documentEntity.syncId = syncId;
            documentEntity.updatedAt = new Date();
            documentEntity.createdAt = new Date();
            this.logger.info(`Saving data in fax entity as ${documentEntity}`);
            const document_master = await this.saveFaxes(documentEntity);
            return document_master;
        } catch (err) {
            throw new HttpError(StatusCodes.BAD_REQUEST, (err as Error).message);
        }
    }
}
