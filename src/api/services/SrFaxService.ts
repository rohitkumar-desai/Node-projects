import { Service } from 'typedi';
import { SrFaxConfig } from '../controllers/requests/SrFaxConfig';
import { SrFaxClient } from './SrFaxClient';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { Builder } from 'builder-pattern';
import moment from 'moment-timezone';
import { FaxClient } from './FaxClient';
import { v4 as uuidv4 } from 'uuid';
import { PartnerDetails } from '../models/PartnerModel';
import { InboxFaxServiceClient } from './InboxFaxClientService';
import { FaxProvider } from '../models/FaxDetails';
import Bluebird from 'bluebird';
@Service()
export class SrFaxService {
    constructor(
        private srFaxClient: SrFaxClient, @Logger(__filename) private logger: LoggerInterface,
        private faxClient: FaxClient,
        private inboxFaxService: InboxFaxServiceClient
    ) { }

    // Get Fax from SRFAX using cron job
    public async SrFaxDetails(partner: PartnerDetails, oneDaySync?: boolean): Promise<void> {
        try {
            let fax;
            const partnerDetails = partner;
            this.logger.info(` sr-fax config details | Total sr-configs ${partnerDetails.srFaxConfig.length} for partnerId ${partner.id}`);

            if (partnerDetails.srFaxConfig.length > 0) {
                partnerDetails.srFaxConfig.map(async (srFaxConfig) => {
                    this.logger.info(`Sr-fax accountNumber ${srFaxConfig.accountNumber} | Sr-fax active ${srFaxConfig.pullFax} for partnerId ${partner.id}`);

                    if (srFaxConfig.isActive && srFaxConfig.pullFax) {
                        this.logger.info(`Sr-Fax config details ${JSON.stringify(srFaxConfig.accountNumber)} for partnerId ${partner.id}`);

                        if (!srFaxConfig.email || !srFaxConfig.password || !srFaxConfig.accountNumber || !partnerDetails.timezone) {
                            this.logger.info(`Sr-Fax config is not available for partnerId ${partner.id} accountNumber ${srFaxConfig.accountNumber} and timezone ${partnerDetails.timezone}`);
                        } else {
                            this.logger.info(`Time zone for partner ${partner.id} is  ${partnerDetails.timezone}`);

                            const currentTime = moment.tz(moment(), partnerDetails.timezone).format('YYYY-MM-DD HH:mm:ss');
                            this.logger.info(`currentTime while fetching srfax ${currentTime} for partner ${partner.id}`);
                            const roundOftime = moment(currentTime).minutes((Math.floor(moment(currentTime).minute() / 5)) * 5);

                            let endDate;
                            let startDate;

                            // Date to fetch faxes from SRFAX.
                            if (!oneDaySync) {
                                startDate = moment.tz(moment(), partnerDetails.timezone).subtract(10, 'minutes').format('YYYYMMDD');
                                endDate = moment.tz(moment(), partnerDetails.timezone).subtract(5, 'minutes').format('YYYYMMDD');
                            } else {
                                startDate = moment.tz(moment(), partnerDetails.timezone).subtract(1, 'day').format('YYYYMMDD');
                                endDate = moment.tz(moment(), partnerDetails.timezone).format('YYYYMMDD');
                            }
                            this.logger.info(`sStartDate ${startDate} and sEndDate ${endDate} for partnerId  ${partner.id}`);

                            const config = Builder(SrFaxConfig).action('Get_Fax_Inbox').access_id(srFaxConfig.accountNumber).access_pwd(srFaxConfig.password)
                                .sPeriod('RANGE').sStartDate(startDate).sEndDate(endDate).sIncludeSubUsers('Y').build();

                            fax = await this.srFaxClient.fetchFaxDetails(config);

                            this.logger.info(`Received fax value ${JSON.stringify(fax)} for partner  ${partner.id}`);
                            const syncId = uuidv4();
                            let faxData: any[] = [];
                            if (fax.length) {
                                await Bluebird.Promise.each(fax, (async (obj: any) => {
                                    await this.checkReceivedFaxEligibility(obj, roundOftime, partnerDetails, srFaxConfig, syncId, faxData, oneDaySync);
                                }));
                            } else {
                                this.logger.info(`Partner ${partner.id} No faxes found`);
                            }
                            if (faxData.length) {
                                this.inboxFaxService.addFaxes(faxData, partner.id);
                            }
                        }
                    }
                });
            }
        } catch (err) {
            this.logger.error(`Getting error while fetching sr-fax data for partner: ${partner.id} as ${(err as Error).message}`);
        }
    }

    private async checkReceivedFaxEligibility(faxDetail: any, roundOftime: any, partnerDetails: PartnerDetails, srFaxConfig: any, syncId: string, faxData: any[], oneDaySync?: boolean): Promise<void> {
        this.logger.info(`Fax created date ${faxDetail.Date} for faxId ${faxDetail.FileName} from ${faxDetail.CallerID} with ${partnerDetails.id}`);
        const faxDate = moment(faxDetail.Date).format('MMM DD/YY HH:mm');
        this.logger.info(`fax date  ${faxDate}`);
        let faxSyncEndTime;
        let faxSyncStartTime;

        // Time range to Save faxes in Phelix.
        if (oneDaySync) {
            this.logger.info(`In one day fax sync`);
            faxSyncStartTime = `${moment.tz(moment(), partnerDetails.timezone).subtract(1, 'day').format('MMM DD/YY HH:mm')}`;
            faxSyncEndTime = `${moment.tz(moment(), partnerDetails.timezone).format('MMM DD/YY HH:mm')}`;
            this.logger.info(`Fax sync start date is ${faxSyncStartTime} and fax sync end date ${faxSyncEndTime} and faxDate ${faxDate} of sr-fax for partner ${partnerDetails.id}`);
        } else {
            this.logger.info(`In Real time fax sync`);
            faxSyncStartTime = moment(roundOftime).subtract(100, 'minutes').startOf('minute').format('MMM DD/YY HH:mm');
            faxSyncEndTime = moment(roundOftime).subtract(1, 'minutes').startOf('minute').format('MMM DD/YY HH:mm');
            this.logger.info(`Time before 1 min ${faxSyncEndTime}, Time before 100 mins ${faxSyncStartTime} and faxDate ${faxDate} of SRFAX for partner ${partnerDetails.id}`);
        }

        if (faxDate > faxSyncStartTime && faxDate <= faxSyncEndTime) {
            faxDetail.faxId = 'SRFAX_' + faxDetail.FileName.split('|')[0];
            faxDetail.faxProvider = FaxProvider.SRFAX;
            faxData.push(faxDetail);
            this.logger.info(`faxFileNumber...${faxDetail.faxId} for partnerId  ${partnerDetails.id}`);
            const existingFax = await this.faxClient.checkFaxByFaxId(partnerDetails.id, faxDetail.faxId)
            if (!existingFax) {
                this.logger.info(`Fax does not exist for Id ${faxDetail.faxId} with partnerId ${partnerDetails.id}, storing it GCP and Fax DB`);
                const savedFaxData = await this.srFaxClient.processSRFaxDetails(faxDetail, srFaxConfig, partnerDetails.id, syncId, partnerDetails.timezone);
                let faxObj = faxData.find(faxDetailToSend => faxDetailToSend.faxId === savedFaxData.faxId);
                Object.assign(faxObj, savedFaxData);
            } else {
                this.logger.info(`Fax is already exist for Id ${faxDetail.faxId} with partnerId ${partnerDetails.id}`);
                let faxObj = faxData.find(faxDetailToSend => faxDetailToSend.faxId === existingFax.faxId);
                Object.assign(faxObj, existingFax);
            }
        } else {
            this.logger.error(`No fax received in given interval start Time ${faxSyncStartTime} and end time ${faxSyncEndTime} at [faxDate]  ${faxDate} for partner ${partnerDetails.id}`);
        }
    }

}
