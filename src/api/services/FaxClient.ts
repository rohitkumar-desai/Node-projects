import { Service } from 'typedi';
import { HttpError } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { Builder } from 'builder-pattern';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../env';
import { FileResponse } from '../controllers/responses/DocumentResponse';
import { Storage } from '@google-cloud/storage';
import { SrFaxClient } from './SrFaxClient';
import { FaxDetailRepo } from '../respositories/FaxDetailRepo';
import axios from 'axios';
import { FaxDetailEntity } from '../entities/FaxDetailEntity';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { FaxStatus, ProcessingStatus, FaxDelete } from '../models/FaxDetails';
import { FaxUploadService } from './FaxUploadService';
import { FaxPaginationResponse } from '../controllers/responses/SrFaxConfigurationResponse';
import moment from 'moment';
import { Brackets, MoreThan } from 'typeorm';
import { PartnerClientService } from './PartnerServiceClient';
import { PaginationParams } from '../controllers/requests/SrFaxConfig';

const storage = new Storage();
const bucket = storage.bucket(env.storageBucketConfig.bucketName);

@Service()
export class FaxClient {
    private url: any;

    constructor(
        @Logger(__filename) private logger: LoggerInterface,
        private srFaxClient: SrFaxClient,
        private faxUploadService: FaxUploadService,
        private partnerClientService: PartnerClientService,
        @OrmRepository() private faxDetailRepo: FaxDetailRepo
    ) { }

    public async uploadFileIntoGCS(resp: any, receivedFaxDetails: any = undefined, partnerId: number): Promise<FileResponse> {
        let newResult: FileResponse;
        // save Pdf file into GCS
        const documentName = uuidv4();
        this.logger.info(`Document name ${documentName}  Upload file into GCS`);
        this.logger.info(`pdfDocumentName ${documentName} Partner ID: ${partnerId}`);
        const pdfBlobStream = bucket.file(`files/partner_${partnerId}/faxes/${documentName}.pdf`);
        const pdfUrl = `https://storage.cloud.google.com/${env.storageBucketConfig.bucketName}/files/partner_${partnerId}/faxes/${documentName}.pdf`;
        this.logger.info(`Document name ${documentName} extensions after blobstream for Partner ID: ${partnerId} `, this.url);
        await pdfBlobStream.save(resp);

        // Convert Pdf file in Tif and into GCS
        const obj = { buffer: resp, originalname: documentName };
        const respTiff = await this.srFaxClient.convertDocument(obj);
        this.logger.info(`Document name ${documentName} Convert Doc values. ${JSON.stringify(respTiff)}`);
        const tiffBlobStream = bucket.file(`files/partner_${partnerId}/faxes/${documentName}.tif`);
        const tiffUrl = `https://storage.cloud.google.com/${env.storageBucketConfig.bucketName}/files/partner_${partnerId}/faxes/${documentName}.tif`;
        const response = await axios.get(`${respTiff.documents[0].url}`, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'utf-8');
        await tiffBlobStream.save(buffer);
        this.logger.info(`Document name ${documentName}  File saved successfully`);
        newResult = {
            pdfId: documentName,
            tifID: documentName,
            pdfFileName: documentName + '.pdf',
            tifFileName: documentName + '.tif',
            pages: respTiff.pages,
            pdfUrl,
            tifUrl: tiffUrl,
        };
        this.logger.info(` Document name ${documentName} Partner ${partnerId} Saved fax for received fax ${receivedFaxDetails} with data as ${newResult} `);
        // Send Kafka event
        const faxNotificationData = {
            partnerId,
            id: newResult.pdfId,
            url: newResult.pdfUrl,
        };
        this.logger.info(` Document name ${documentName} Uploaded file to Server. Partner ID: ${partnerId}`, faxNotificationData);
        await this.srFaxClient.faxFileNotification(faxNotificationData);
        return newResult;
    }

    public async saveFaxDetails(partnerId: number, faxId: string, data: any, fileResponse: any, partnerTimeZone: string): Promise<FaxDetailEntity> {
        try {
            this.logger.info(`save fax details ${JSON.stringify(data)} for partnerId ${partnerId}`);
            this.logger.info(`save Fax details file response for ${partnerId} with ${JSON.stringify(fileResponse)}`);
            this.logger.info(`Received partner time zone as ${partnerTimeZone}`);
            let faxEntity = new FaxDetailEntity();
            faxEntity = Builder(FaxDetailEntity)
                .faxId(faxId)
                .partnerId(partnerId)
                .pdfDocumentId(fileResponse.pdfId)
                .pdfDocumentName(fileResponse.pdfFileName)
                .tifDocumentId(fileResponse.tifID)
                .tifDocumentName(fileResponse.tifFileName)
                .pages(fileResponse.pages)
                .fromFaxNumber(fileResponse.faxNumber)
                .recipientFaxNumber(fileResponse.faxNumber)
                .faxCreatedAt(data.CreateTime)
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

            this.logger.info(`Saving data in fax entity as  ${JSON.stringify(faxEntity)}`);
            const document_master = await this.srFaxClient.saveFaxes(faxEntity);

            return document_master;
        } catch (err) {
            this.logger.info(`Getting error while save fax ${JSON.stringify(err)}`);
            throw new HttpError(StatusCodes.BAD_REQUEST, (err as Error).message);
        }
    }
    // Pagination for all fax data
    public async findAllFaxes(partnerId: number, query?: PaginationParams): Promise<FaxPaginationResponse> {
        try {
            this.logger.info(`Find all faxes including pagination ${partnerId}`);
            let page: number;
            let limit: number;
            if (query) {
                page = query.page;
                limit = query.limit;
            }
            page = (page !== undefined) ? page : 1;
            limit = (limit !== undefined) ? limit : 10;
            const offset = (page - 1) * limit;
            const faxes = await this.faxDetailRepo.findAndCount({
                where: { partnerId, isActive: true },
                order: { faxCreatedAt: 'DESC' },
                skip: offset,
                take: limit,
            });
            const faxResponse = {} as FaxPaginationResponse;
            faxResponse.totalPage = Math.ceil(faxes[1] / limit);
            this.logger.info(`count ${faxes[1]} offset ${offset} totalPage ${faxResponse.totalPage} for partner ${partnerId}`);
            faxResponse.paginationDataObj = faxes[0];
            return faxResponse;
        } catch (e) {
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `Unable to fetch faxes for partnerId ${partnerId} with error ${(e as Error).message}`);
        }
    }

    // Get all stored faxes by partner-id and fax-id
    public async checkFaxByFaxId(partnerId: number, faxId: string): Promise<FaxDetailEntity> {
        this.logger.info(`Check fax exist for fax-Id ${faxId} and partnerId ${partnerId}`);
        const existingFax: FaxDetailEntity = await this.faxDetailRepo.findOne({
            where: { partnerId, faxId },
        });
        if (!existingFax) {
            this.logger.info(`No Fax exists for partner id ${partnerId} and fax-Id ${faxId}`);
            return undefined;
        } else {
            this.logger.info(`Existing fax detail for parnterId and faxId is ${JSON.stringify(existingFax.faxId)} ${partnerId}`);
            return existingFax;
        }
    }

    // Soft delete by id
    public async deleteFax(partnerId: number, id: number, status: FaxStatus): Promise<FaxDetailEntity> {
        this.logger.info(`soft delete fax for ${id} with ${partnerId}`);
        const faxDetailObj: FaxDetailEntity = await this.faxDetailRepo.findOne({
            where: {
                partnerId,
                id,
            },
        });
        if (!faxDetailObj) {
            throw new HttpError(StatusCodes.NOT_FOUND, `No Fax exists for partner id ${partnerId}`);
        }
        faxDetailObj.isActive = false;
        faxDetailObj.updatedAt = new Date();
        faxDetailObj.faxStatus = status;
        faxDetailObj.faxStatusDate = new Date();
        await this.faxDetailRepo.save(faxDetailObj);
        this.logger.info(`Updated data ${JSON.stringify(faxDetailObj)} for partnerId ${partnerId}`);
        return faxDetailObj;
    }

    // Pagination for all fax data
    public async findAll(partnerId: number, page?: number, limit?: number): Promise<FaxPaginationResponse> {
        try {
            this.logger.info(`Find all faxes including pagination ${partnerId}`);
            page = page ? page : 1;
            limit = limit ? limit : 10;
            const offset = (page - 1) * limit;
            const paginationDataObj: FaxDetailEntity[] = await this.faxDetailRepo.find({
                where: { partnerId, isActive: true },
                order: { id: 'DESC' },
                skip: offset,
                take: limit,
            });
            const count = await this.faxDetailRepo.count({
                where: { partnerId, isActive: true },
            });
            const totalPage = Math.ceil(count / limit);
            this.logger.info(`count ${count} offset ${offset} totalPage ${totalPage} for partner ${partnerId}`);
            return {
                paginationDataObj,
                totalPage,
            };
        } catch (e) {
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `Unable to fetch faxes for partnerId ${partnerId} with error ${(e as Error).message}`);
        }
    }

    // fax count by date
    public async faxCountByDate(partnerId: number, startDate?: string, endDate?: string): Promise<any> {
        try {
            const allFaxCount = await this.faxDetailRepo.createQueryBuilder()
                .select('partner_id, count(*) fax_count')
                .where('partner_id = :partnerId', { partnerId })
                .where(`CREATED_AT BETWEEN "${startDate}" AND "${endDate}"`)
                .groupBy('partner_id').execute();
            const faxCount = await this.faxDetailRepo.createQueryBuilder()
                .select('partner_id, SUM(FAX_STATUS = "referral") AS referral, SUM(FAX_STATUS = "save") AS save, SUM(FAX_STATUS = "delete") AS "delete"')
                .where('partner_id = :partnerId', { partnerId })
                .where(`FAX_STATUS_DATE BETWEEN "${startDate}" AND "${endDate}"`)
                .groupBy('partner_id').execute();
            const averageTimeOnFax = await this.faxDetailRepo.createQueryBuilder()
                .select('partner_id, sum(TIMESTAMPDIFF(MINUTE,CREATED_AT,FAX_STATUS_DATE))/count(FAX_STATUS) as average')
                .where('partner_id = :partnerId', { partnerId })
                .where(`FAX_STATUS_DATE BETWEEN "${startDate}" AND "${endDate}"`)
                .groupBy('FAX_STATUS, PARTNER_ID').execute();

            this.logger.info(`fax count by date = ${startDate} `, allFaxCount, faxCount);
            return { 'All Fax count': allFaxCount, 'Fax Count': faxCount, 'Average Time On Fax': averageTimeOnFax };
        } catch (err) {
            this.logger.error(`Getting error while fetching faxes for partner ${partnerId} ${err}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, (err as Error).message);
        }
    }

    public async retryFax(partnerId: number, id?: number): Promise<any> {
        try {
            const faxDetailObj: FaxDetailEntity = await this.faxDetailRepo.findOne({
                where: { partnerId, isActive: true, id },
            });
            if (!faxDetailObj) {
                this.logger.error(`No Fax exists for this id ${id} and partner id ${partnerId}`);
                throw new HttpError(StatusCodes.NOT_FOUND, `No Fax exists`);
            }
            const fileURL = `https://storage.cloud.google.com/${env.storageBucketConfig.bucketName}/files/partner_${partnerId}/faxes/${faxDetailObj.pdfDocumentId}.pdf`;
            const faxNotificationData = {
                partnerId,
                id: faxDetailObj.pdfDocumentId,
                url: fileURL,
            };
            faxDetailObj.processingStatus = ProcessingStatus.PROCESSING;
            await this.faxDetailRepo.save(faxDetailObj);
            await this.faxUploadService.FaxNotification(faxNotificationData);
        } catch (err) {
            this.logger.error(`Getting error while retry fax for partner ${partnerId} ${(err as Error).message}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, (err as Error).message);
        }
    }

    public async autoRetryFax(): Promise<void> {
        try {
            const partners = await this.partnerClientService.getPartners();
            this.logger.info(`Getting partner details for auto-retry-fax for partner ${partners.id}`);

            const date = moment().subtract(48, 'hours').format();
            this.logger.info(`date before 48 hrs ${date}`);
            await Promise.all(
                partners.map(async (partner) => {
                    const faxDetailObj: FaxDetailEntity[] = await this.faxDetailRepo.find({
                        where: {
                            partnerId: partner.id,
                            isActive: true,
                            processingStatus: 'FAIL',
                            faxCreatedAt: MoreThan(date),
                        },
                    });
                    if (!faxDetailObj.length) {
                        this.logger.info(`No Fax exists for partner id ${partner.id}`);
                    }
                    this.logger.info(`Fax data which status having 'FAIL' is ${JSON.stringify(faxDetailObj)} for partner ${partner.id}`);
                    faxDetailObj.map(async fax => {
                        this.logger.info(`values of fax: ${JSON.stringify(fax)} for partner: ${partner.id}`);
                        const fileURL = `https://storage.cloud.google.com/${env.storageBucketConfig.bucketName}/files/partner_${partner.id}/faxes/${fax.pdfDocumentId}.pdf`;
                        const faxNotificationData = {
                            partnerId: partner.id,
                            id: fax.pdfDocumentId,
                            url: fileURL,
                        };
                        this.logger.info(`faxNotificationData ${JSON.stringify(faxNotificationData)} for partner: ${partner.id}`);
                        await this.faxUploadService.FaxNotification(faxNotificationData);
                    });
                })
            );
        } catch (err) {
            this.logger.error(`Getting error while auto-retry fax ${err}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, (err as Error).message);
        }
    }
    // get fax list data 
    public async getFaxList(partnerId: number, query: PaginationParams): Promise<FaxPaginationResponse> {
        try {
            this.logger.info(`Find faxes query params ${JSON.stringify(query)} for partner ${partnerId}`);
            let page: number;
            let limit: number;
            if (query) {
                page = query.page;
                limit = query.limit;
            }
            page = (page !== undefined) ? page : 1;
            limit = (limit !== undefined) ? limit : 10;
            const offset = (page - 1) * limit;
            const searchString = query.searchString ? query.searchString : '';
            const trash = query.faxType && query.faxType === 'trash' ? true : false;
            const sqlQuery = this.faxDetailRepo.createQueryBuilder('FaxDetail')
                .where('FaxDetail.partnerId = :partnerId', { partnerId })
                .andWhere('FaxDetail.isActive = :isActive', { isActive: true })
                .andWhere('FaxDetail.trashed = :trashed', { trashed: trash })
                .orderBy("FaxDetail.faxCreatedAt", 'DESC')
                .offset(offset)
                .limit(limit);
            if (searchString) {
                sqlQuery.andWhere(new Brackets((qb) => {
                    qb.where('FaxDetail.recipientFaxNumber like :recipientFaxNumber', { recipientFaxNumber: `%${searchString}%` })
                        .orWhere('FaxDetail.patientName like :patientName', { patientName: `%${searchString}%` })
                        .orWhere('FaxDetail.ohip like :ohip', { ohip: `%${searchString}%` });
                }))
            }
            const paginationDataObj = await sqlQuery.getMany();
            const count = await sqlQuery.getCount();
            const totalPage = Math.ceil(count / limit);
            this.logger.info(`count ${count} offset ${offset} totalPage ${totalPage} for partner ${partnerId}`);
            return {
                paginationDataObj,
                totalPage,
            };
        } catch (e) {
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `Unable to fetch faxes for partnerId ${partnerId} with error ${(e as Error).message}`);
        }
    }
    // delete faxes V2
    public async deleteFaxes(partnerId: number, query: FaxDelete): Promise<any> {
        this.logger.info(`delete faxes query params ${JSON.stringify(query)} for partnerId ${partnerId}`);
        try {
            let faxDetailObj;
            if (query.status === FaxStatus.TRASH) {
                faxDetailObj = await this.faxDetailRepo.createQueryBuilder()
                    .update(FaxDetailEntity)
                    .set({ trashed: true })
                    .where('id IN (:...id)', { id: query.id })
                    .andWhere('partnerId = :partnerId', { partnerId })
                    .execute();
            } else {
                faxDetailObj = await this.faxDetailRepo.createQueryBuilder()
                    .update(FaxDetailEntity)
                    .set({
                        trashed: false,
                        isActive: false,
                        faxStatus: query.status,
                        faxStatusDate: new Date(),
                        updatedAt: new Date()
                    })
                    .where('id IN (:...id)', { id: query.id })
                    .andWhere('partnerId = :partnerId', { partnerId })
                    .execute();
            }
            this.logger.info(`Updated data ${JSON.stringify(faxDetailObj)} for partnerId ${partnerId}`);
            return faxDetailObj;
        } catch (err) {
            this.logger.error(`Getting error while delete fax for partner ${partnerId} errors ${JSON.stringify(err)}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, (err as Error).message);
        }
    }
}
