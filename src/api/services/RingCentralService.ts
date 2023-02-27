import { Service } from 'typedi';
import { RingCentralClient } from './RingCentralClient';
import { HttpError } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { FileResponse } from '../controllers/responses/DocumentResponse';
import axios from 'axios';
import querystring from 'querystring';
import { env } from '../../env';
import moment from 'moment-timezone';
import { FaxClient } from './FaxClient';
import { RingCentralSendFaxResponse } from '../models/RingCentralSendFaxResponse';
import { PartnerClientService } from './PartnerServiceClient';
import { Builder } from 'builder-pattern';
import { RingCentralConfig } from '../controllers/requests/RingCentralParams';

@Service()
export class RingCentralService {

    constructor(
        private ringCentralClient: RingCentralClient,
        @Logger(__filename) private logger: LoggerInterface,
        private faxClient: FaxClient,
        private partnerClientService: PartnerClientService
    ) { }

    public async ringCentralFaxDetails(partner: any): Promise<void> {
        try {

            this.logger.info(`Ring-central config details | Total ring-central-configs ${partner.ringCentralConfig.length} for partnerId ${partner.id}`);

            if (partner.ringCentralConfig.length > 0) {
                partner.ringCentralConfig.map(async config => {
                    try {
                        if (!config.ringCentralClientId || !config.ringCentralRefreshToken
                            || !config.ringCentralClientSecret || !partner.timezone) {
                            this.logger.info(`Required ringCentralConfig is not available for partner id  ${partner.id}`);
                        }

                        this.logger.info(`Fetching ringCentral Details for ${partner.id} with Timezone ${partner.timezone} `);
                        const ringCentralToken = await this.getAccessToken(config);
                        const ringCentralConfig = Builder(RingCentralConfig)
                            .ringCentralToken(ringCentralToken.access_token)
                            .ringCentralRefreshToken(ringCentralToken.refresh_token)
                            .build();
                        await this.partnerClientService.saveUpdatedToken(partner.id, ringCentralConfig, config.id);
                        // Get RingCentral Messages / faxes
                        await this.getRingCentralFaxList(partner.id, ringCentralToken.access_token, partner.timezone);
                    } catch (err) {
                        this.logger.error(`Getting error while fetching ring-central fax data for partner: ${partner.id} as ${(err as Error).message}`);
                    }
                });
            }
        } catch (err) {
            this.logger.error(`Getting error while fetch ring-central data for partner: ${partner.id} as ${(err as Error).message}`);
        }
    }

    public async getRingCentralFaxList(partnerId: number, accessToken: any, timezone: string): Promise<any> {
        try {
            this.logger.info(`getMessageList Service ${partnerId} `);
            const resp = await this.ringCentralClient.fetchFaxList(partnerId, accessToken);
            this.logger.info(`Getting ring-central faxes successfully`);
            if (!resp.records.length) {
                this.logger.error(`No Faxes exists for given details for partner ${partnerId}`);
            }
            this.logger.info(`Received faxes for ring-central :  ${JSON.stringify(resp.records)}`);
            let fileData: any;
            resp.records.map(records => {
                this.logger.info(`records.. :  ${JSON.stringify(records.attachments)}`);
                this.logger.info(`timezone.. :  ${timezone}`);

                const creationDate = moment(records.creationTime).tz(timezone).format('YYYY-MM-DD HH:mm:ss');
                const before5Mins = moment().tz(timezone).subtract(5, 'minutes').startOf('minute').format('YYYY-MM-DD HH:mm:ss');
                const before10Mins = moment().tz(timezone).subtract(10, 'minutes').startOf('minute').format('YYYY-MM-DD HH:mm:ss');
                this.logger.info(`creationDate.. :  ${creationDate}`);
                this.logger.info(`before5Mins.. :  ${before5Mins}`);
                this.logger.info(`before10Mins.. :  ${before10Mins}`);
                if (creationDate > before10Mins && creationDate < before5Mins) {
                    this.logger.info(`Get file and Save data..`);
                    records.attachments.map(async attachments => {
                        const messageId = attachments.id;
                        this.logger.info(`messageID :  ${messageId}`);
                        fileData = await this.getFaxFile(partnerId, messageId, accessToken);
                        this.logger.info(`fileData : ${JSON.stringify(fileData)}`);
                        fileData.faxNumber = (records.from.phoneNumber).substring(2);
                        this.logger.info(`faxnumber : ${JSON.stringify(fileData.faxNumber)}`);
                        this.logger.info(`record after getting file : ${JSON.stringify(records)}`);
                        const faxId = 'RingCentral_' + partnerId + '_' + fileData.faxNumber;

                        await this.faxClient.saveFaxDetails(partnerId, faxId,  records, fileData, timezone);
                    });
                } else {
                    this.logger.error(`No Fax exists in current time period for partner ${partnerId}`);
                }
            });
            return resp;
        } catch (err) {
            throw new HttpError(StatusCodes.BAD_REQUEST, (err as Error).message);
        }
    }

    public async getFaxFile(partnerId: number, messageId: number, accessToken: any): Promise<FileResponse> {
        let newResult: FileResponse;
        try {
            this.logger.info(`getFaxFile Service getFaxFile :  ${(messageId)} ${partnerId}`);
            const resp = await this.ringCentralClient.getFaxFile(partnerId, messageId, accessToken);
            if (!resp) {
                this.logger.error(`No Message exists for given details`);
                throw new HttpError(StatusCodes.BAD_REQUEST, `No Message exists for given details`);
            }
            newResult = await this.faxClient.uploadFileIntoGCS(resp, undefined, partnerId);
            return newResult;
        } catch (err) {
            throw new HttpError(StatusCodes.BAD_REQUEST, (err as Error).message);
        }
    }

    // Get Access token using refresh token
    public async getAccessToken(config: any): Promise<any> {
        this.logger.info(`Ring-central config value ${JSON.stringify(config.ringCentralClientId)}`);

        const auth = `${config.ringCentralClientId}:${config.ringCentralClientSecret}`;
        const res = await axios.post(`${env.serviceMesh.ringCentral.accessToken}`,
            querystring.stringify({
                grant_type: 'refresh_token',
                refresh_token: config.ringCentralRefreshToken,
            }),
            {
                headers: {
                    ContentType: 'application/x-www-form-urlencoded',
                    Authorization: 'Basic ' + Buffer.from(auth).toString('base64'),
                    Accept: 'application/json',
                },
            });
        return res.data;
    }

    public async sendFax(file: any[], faxNumber: string[], accessToken: any): Promise<RingCentralSendFaxResponse> {
        try {
            const sendFaxResult = await this.ringCentralClient.sendFax(file, faxNumber, accessToken);
            this.logger.info(`Ring Central Send Fax Result`, sendFaxResult);

            return sendFaxResult;
        } catch (err) {
            throw new HttpError(StatusCodes.BAD_REQUEST, (err as Error).message);
        }
    }

}
