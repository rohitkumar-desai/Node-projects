import { PartnerDetails } from '../models/PartnerModel';
import { Service } from 'typedi';
import { SrFaxConfig } from '../controllers/requests/SrFaxConfig';
import { HttpError } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { Builder } from 'builder-pattern';
import { PartnerClientService } from './PartnerServiceClient';
import moment from 'moment-timezone';
import { UniteFaxService } from './UniteFaxService';
import { FaxClient } from './FaxClient';
import { SrFaxClient } from './SrFaxClient';
import { FaxSyncRequestModel, FaxProvider } from '../models/FaxDetails';
import { env } from '../../env';
import { v4 as uuidv4 } from 'uuid';
import { InboxFaxServiceClient } from './InboxFaxClientService';
import Bluebird from 'bluebird';

@Service()
export class FaxOneTimeSyncService {
    constructor(
        @Logger(__filename) private logger: LoggerInterface,
        private srFaxClient: SrFaxClient,
        private partnerClientService: PartnerClientService,
        private uniteFaxService: UniteFaxService,
        private faxClient: FaxClient,
        private inboxFaxService: InboxFaxServiceClient
    ) { }

    public async syncFaxesByTimeRange(partnerId: number, faxSyncRequest: FaxSyncRequestModel): Promise<void> {
        try {
            const partnerDetails = await this.partnerClientService.getPartnerDetail(partnerId);
            if (faxSyncRequest.faxProvider === FaxProvider.SRFAX) {
                this.logger.info(`Sync requested for fax provider ${faxSyncRequest.faxProvider}`);
                this.srFaxSync(partnerId, partnerDetails, faxSyncRequest);
            } else if (faxSyncRequest.faxProvider === FaxProvider.UNITE_FAX) {
                this.logger.info(`Sync requested for fax provider ${faxSyncRequest.faxProvider}`);
                this.uniteFaxSync(partnerId, partnerDetails, faxSyncRequest);
            }
        } catch (err) {
            this.logger.error(`Getting error while fetching faxes for partner ${partnerId} ${err}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, (err as Error).message);
        }
    }

    public async srFaxSync(partnerId: number, partnerDetails: PartnerDetails, faxSyncRequest: FaxSyncRequestModel): Promise<void> {
        let fax;
        this.logger.info(`In SRFAX sync function for partnerId ${partnerId}`);
        this.logger.info(`SRFAX-fax config details | Total Number of SRFAX ${SrFaxConfig.length} for partnerId ${partnerId}`);
        try {
            if (partnerDetails.srFaxConfig.length > 0) {
                partnerDetails.srFaxConfig.map(async (srFaxConfig) => {
                    if (!srFaxConfig.isActive || !srFaxConfig.pullFax || !srFaxConfig.email || !srFaxConfig.password || !srFaxConfig.accountNumber) {
                        this.logger.error(`SRFax config is not appropriate for partner id ${partnerId}`);
                        throw new Error(`SRFax fax config is not appropriate for partner id ${partnerId}`);
                    } else {
                        if (!partnerDetails.timezone) {
                            this.logger.error(`Timezone is not added for partnerDetails id ${partnerDetails.id}`);
                            throw new Error(`Timezone is not added for partnerDetails id ${partnerDetails.id}`);
                        }

                        const startDate = moment(faxSyncRequest.startDate).format('YYYYMMDD');
                        const endDate = moment(faxSyncRequest.endDate).format('YYYYMMDD');

                        this.logger.info(`startDate ${startDate} and endDate ${endDate} for partner ${partnerId}`);

                        const config = Builder(SrFaxConfig).action('Get_Fax_Inbox').access_id(srFaxConfig.accountNumber).access_pwd(srFaxConfig.password)
                            .sPeriod('RANGE').sStartDate(startDate).sEndDate(endDate).sIncludeSubUsers('Y').build();
                        fax = await this.srFaxClient.fetchFaxDetails(config);

                        if (!fax.length) {
                            this.logger.error(`No Fax exists for partner ${partnerId}`);
                        }
                        this.logger.info(`Received fax value in given time ${fax.length} for partner ${partnerId}`);
                        let faxData: any[] = [];
                        if (fax.length) {
                            await Bluebird.Promise.each(fax, (async (obj: any) => {
                                obj.faxId = 'SRFAX_' + obj.FileName.split('|')[0];
                                faxData.push(obj);
                                this.logger.info(`faxFileNumber...${obj.faxId} for partnerId ${partnerId}`);

                                const existingFax = await this.faxClient.checkFaxByFaxId(partnerId, obj.faxId)
                                if (!existingFax) {
                                    this.logger.info(`Adding Fax to process ${obj.faxId} and partner ${partnerId}`);
                                    const syncId = uuidv4();
                                    const savedFaxData = await this.srFaxClient.processSRFaxDetails(obj, srFaxConfig, partnerId, syncId, partnerDetails.timezone);
                                    const faxObj = faxData.length && faxData.find(faxDetail => faxDetail.faxId === savedFaxData.faxId);
                                    if (faxObj) {
                                        faxObj.faxProvider = FaxProvider.SRFAX;
                                    }
                                    Object.assign(faxObj, savedFaxData);
                                } else {
                                    this.logger.info(`Duplicate Fax found for id ${obj.faxId} for partnerId ${partnerId}`);
                                    const faxObj = faxData.length && faxData.find(faxDetail => faxDetail.faxId === existingFax.faxId);
                                    if (faxObj) {
                                        faxObj.faxProvider = FaxProvider.SRFAX;
                                    }
                                    Object.assign(faxObj, existingFax);
                                }
                            }));
                        }
                        if (faxData.length) {
                            this.inboxFaxService.addFaxes(faxData, partnerId);
                        }

                    }
                });
            }
        } catch (err) {
            this.logger.error(`Got error while performing One time sync for partenrId ${partnerId} as ${JSON.stringify(err)}`);
        }
    }

    public async uniteFaxSync(partnerId: number, partnerDetails: PartnerDetails, faxSyncRequest: FaxSyncRequestModel): Promise<void> {
        try {
            this.logger.info(`In Unite fax sync function for partnerId ${partnerId}`);
            this.logger.info(`Unite-fax config details | Total Unite-fax ${partnerDetails.uniteFaxConfig} for partnerId ${partnerId}`);
            if (partnerDetails.uniteFaxConfig.length > 0) {
                partnerDetails.uniteFaxConfig.map(async (uniteFaxConfig) => {
                    if (!uniteFaxConfig.isActive || !uniteFaxConfig.username || !uniteFaxConfig.password || !uniteFaxConfig.url) {
                        this.logger.error(`Unite fax config is not available for partner id ${partnerId}`);
                        throw new Error(`Unite fax config is not available for partner id ${partnerId}`);
                    } else {
                        if (!partnerDetails.timezone) {
                            this.logger.error(`Timezone is not added for partnerDetails id ${partnerDetails.id}`);
                            throw new Error(`Timezone is not added for partnerDetails id ${partnerDetails.id}`);
                        }

                        this.logger.info(`Time zone for partner ${partnerDetails.timezone}`);
                        const currentTime = moment.tz(moment(), partnerDetails.timezone).format('YYYY-MM-DD HH:mm:ss');
                        this.logger.info(`currentTime as per the time zone of partner ${currentTime}`);

                        this.logger.info(`Going to create SOAP client for PartnerId ${partnerId}`);
                        const startTime = moment(faxSyncRequest.startDate).tz(partnerDetails.timezone).format();
                        const endTime = moment(faxSyncRequest.endDate).tz(partnerDetails.timezone).format();
                        const args0 = {
                            QueryReceiveFaxInput: {
                                Authentication: {
                                    Login: uniteFaxConfig.username,
                                    Password: uniteFaxConfig.password,
                                },
                                DatetimeAfter: startTime,
                                DatetimeBefore: endTime,
                                ResultLimit: `${env.serviceMesh.uniteFaxConfig.faxFetchLimit}`,
                            },
                        };
                        this.logger.info(`Fetching Faxes using created Soap request for partnerId ${partnerId}`);
                        await this.uniteFaxService.UniteFaxDetails(partnerDetails, args0);
                    }
                });
            }
        } catch (err) {
            this.logger.error(`Got error while performing One time sync for partenrId ${partnerId} as ${JSON.stringify(err)}`);
        }
    }

}
