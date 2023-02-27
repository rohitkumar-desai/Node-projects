import Container, { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { FaxClient } from './FaxClient';
import * as soap from 'soap';
import axios from 'axios';
import FormData from 'form-data';
import moment from 'moment-timezone';
import { env } from '../../env';
import { UniteFaxPartnerResponse } from './../controllers/responses/UniteFaxConfigResponse';
import { FaxSendData } from '../models/FaxOutbound';
import { FaxProvider, ProcessingStatus } from '../models/FaxDetails';
import { FaxOutboundV2Service } from './FaxOutboundV2Service';
import { FaxDetailEntity } from '../entities/FaxDetailEntity';
import { InboxFaxServiceClient } from './InboxFaxClientService';
import Bluebird from 'bluebird';

@Service()
export class UniteFaxService {

    constructor(
        @Logger(__filename) private logger: LoggerInterface,
        private faxOutboundV2Service: FaxOutboundV2Service,
        private inboxFaxService: InboxFaxServiceClient
    ) { }

    public async UniteFaxDetails(partner: any, arg?: any, oneDaySync?: boolean): Promise<any> {
        try {
            this.logger.info(`Unit-fax config details | Total unite-config  ${partner.uniteFaxConfig.length} for partnerId  ${partner.id}`);

            if (partner.uniteFaxConfig.length > 0) {
                await partner.uniteFaxConfig.map(async config => {
                    try {
                        if (config.isActive && config.pullFax && config.username && config.password && config.url) {
                            // soap call for oscar auth
                            if (!partner.timezone) {
                                this.logger.error(`Value of timezone is empty for partner id ${partner.id}`);
                                throw new Error(`Value of timezone is empty for partner id ${partner.id}`);
                            }
                            this.logger.info(`Partner id ${partner.id} Time zone ${partner.timezone}. Now going to create SOAP client`);
                            const endpoint = config.url;
                            const soapClient = await this.createSoapClient(endpoint);
                            let fetchStartTime;
                            let fetchEndtime;
                            if (!oneDaySync && !arg) {
                                fetchStartTime = `${moment.utc().startOf('day').format()}`;
                                fetchEndtime = `${moment.utc().add(1, 'd').startOf('day').format()}`;
                            } else if (oneDaySync) {
                                fetchStartTime = `${moment.utc().subtract(1, 'day').format()}`;
                                fetchEndtime = `${moment.utc().format()}`;
                            }
                            let args0: any;
                            if (arg) {
                                this.logger.info(`Partner id ${partner.id} |  Got the Unite fax query argument to execute for one time sync`);
                                args0 = arg;
                                this.logger.info(`Partner id ${partner.id} | Argument to execute ${JSON.stringify(args0)}`);
                            } else {
                                this.logger.info(`Partner id ${partner.id} |  Didn't get the Unite fax query argument to execute for real time sync`);
                                args0 = {
                                    QueryReceiveFaxInput: {
                                        Authentication: {
                                            Login: config.username,
                                            Password: config.password,
                                        },
                                        DatetimeAfter: fetchStartTime,
                                        DatetimeBefore: fetchEndtime,
                                    },
                                };
                                this.logger.info(`Partner id ${partner.id} | Argument to execute ${JSON.stringify(args0)}`);
                            }
                            this.logger.info(`Partner id ${partner.id} fetching faxes for timerange ${fetchStartTime} to ${fetchEndtime}`);
                            // SOAP request to get fax details
                            soapClient.QueryReceiveFax(args0, (errReceiveFax: any, resultReceiveFax: any) => {
                                this.processReceivedFaxes(errReceiveFax, resultReceiveFax, partner, config);
                            });
                        }
                    } catch (err) {
                        this.logger.error(`Getting error while fetching Unite faxes for ${partner.id} as ${(err as Error).message}`);
                    }
                });
            }
        } catch (err) {
            this.logger.error(`Getting error in partner ${partner.id} ${err}`);
        }
    }

    public async processReceivedFaxes(errReceiveFax: any, resultReceiveFax: any, partner: any, uniteFaxConfig: any): Promise<void> {
        if (errReceiveFax) {
            this.logger.error(`Partner ${partner.id} Error from unite soap api ${JSON.stringify(errReceiveFax.message)}`);
        } else {
            this.logger.info(`Partner ${partner.id} fax api response`, JSON.stringify(resultReceiveFax));
            if (resultReceiveFax.QueryReceiveFaxOutput.FaxInfo && resultReceiveFax.QueryReceiveFaxOutput.FaxInfo.length) {
                let faxData: any[] = [];
                await Bluebird.Promise.each(resultReceiveFax.QueryReceiveFaxOutput.FaxInfo, async (obj: any) => {
                    obj.faxId = 'UNITE_' + partner.id + '_' + obj.FaxId;
                    obj.faxProvider = FaxProvider.UNITE_FAX;
                    faxData.push(obj);
                    await this.processIndividualFaxDetail(obj, partner, uniteFaxConfig, obj.faxId, faxData).then(() => {
                        this.logger.info(`Proceed fax ${obj.FaxId} for partner id  ${partner.id} `);
                    }).catch(ex => {
                        this.logger.error(`Error while processing fax - ${obj.FaxId} for partner id  ${partner.id} - ${JSON.stringify(ex)}`);
                    });
                });
                if (faxData.length) {
                    this.inboxFaxService.addFaxes(faxData, partner.id);
                }
            } else {
                this.logger.info(`Partner ${partner.id} No faxes found`);
            }
        }
    }

    public async processIndividualFaxDetail(obj: any, partner: any, uniteFaxConfig: any, faxId: string, faxDetail: FaxDetailEntity[]): Promise<void> {
        this.logger.info(`Partner ${partner.id} Processing fax ${JSON.stringify(obj)}`);
        try {
            const faxClient = Container.get(FaxClient);
            const existingFax = await faxClient.checkFaxByFaxId(partner.id, faxId);
            if (!existingFax) {
                this.logger.info(`Partner ${partner.id} Adding unique fax to phelix ${faxId}`);
                let fileData: any;
                const data = new FormData();
                data.append('FaxId', obj.FaxId);
                data.append('FaxContentType', 'pdf');
                data.append('username', uniteFaxConfig.username);
                data.append('password', uniteFaxConfig.password);
                data.append('url', uniteFaxConfig.url);
                const url = `${env.serviceMesh.uniteFaxConfig.getPdf}`;
                const response = await axios({
                    method: 'post',
                    url,
                    data,
                    headers: {
                        ...data.getHeaders(),
                    },
                });
                this.logger.info(`Response for get file ${JSON.stringify(response.data)}`);
                this.logger.info(`Response file URL ${JSON.stringify(response.data.url)}`);
                const response1 = await axios.get(`${response.data.url}`, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response1.data, 'utf-8');
                fileData = await faxClient.uploadFileIntoGCS(buffer, obj, partner.id);
                fileData.faxNumber = obj.CallerNumber;
                this.logger.info(`fileData ${JSON.stringify(fileData)}`);
                const savedFaxData = await faxClient.saveFaxDetails(partner.id, faxId, obj, fileData, partner.timezone);
                const faxObj = faxDetail.find(savedFaxDetail => savedFaxData.faxId === savedFaxDetail.faxId);
                Object.assign(faxObj, savedFaxData);

            } else {
                const faxObj = faxDetail.find(savedFaxDetail => existingFax.faxId === savedFaxDetail.faxId);
                Object.assign(faxObj, existingFax);
            }
        }
        catch (error) {
            this.logger.error(`Partner ${partner.id} Error - Error while processing fax as ${JSON.stringify(error)}`);
        }
    }

    public async createSoapClient(endpoint: string): Promise<any> {
        return new Promise((resolve, reject) => {
            soap.createClient(endpoint, (error: any, client: any) => {
                if (error) {
                    this.logger.error(`Error while creating SOAP client for ${endpoint}, is ${JSON.stringify(error)}`);
                    reject(error);
                } else {
                    this.logger.info(` SOAP client for ${endpoint}, is created`);
                    resolve(client);
                }
            });
        });
    }

    public async sendFax(file: any, uniteFaxConfig: UniteFaxPartnerResponse, faxNumbers: string[], faxData?: FaxSendData): Promise<any> {
        try {
            const data = {
                SendFaxInput: {
                    Authentication: {
                        Login: uniteFaxConfig.username,
                        Password: uniteFaxConfig.password,
                    },
                    FaxRecipient: {
                        FaxNumber: faxNumbers.join(),
                    },
                    Attachment: {
                        ContentType: 'application/pdf',
                        FileName: 'template.pdf',
                        AttachmentContent: file.toString('base64'),
                    },
                },
            };
            const soapClient = await this.createSoapClient(uniteFaxConfig.url);
            await soapClient.SendFax(data, (errReceiveFax: any, resultReceiveFax: any) => {
                if (errReceiveFax) {
                    this.logger.error(`Unable to send fax via unite fax ${faxNumbers.join()} error ${JSON.stringify(errReceiveFax.message)}`);
                    if (faxData) {
                        this.faxOutboundV2Service.updateFaxSendStatus(FaxProvider.UNITE_FAX, ProcessingStatus.FAIL, uniteFaxConfig.username, faxData, `${JSON.stringify(errReceiveFax)}`);
                    }
                } else {
                    this.logger.info(`Unite fax sent successfully ${JSON.stringify(resultReceiveFax)}`);
                    if (faxData) {
                        this.faxOutboundV2Service.updateFaxSendStatus(FaxProvider.UNITE_FAX, ProcessingStatus.SUCCESS, uniteFaxConfig.username, faxData);
                    }
                }
            });
        } catch (error) {
            this.logger.error(`Unable to send fax via unite fax ${JSON.stringify(error)}`);
        }
    }

}
