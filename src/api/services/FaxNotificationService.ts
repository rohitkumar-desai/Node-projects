import admin from 'firebase-admin';
import { Service } from 'typedi';
import * as IORedis from 'ioredis';
import { env } from '../../env';
import { FaxNotificationRequest } from '../controllers/requests/FaxNotificationRequest';
import { PartnerClientService } from './PartnerServiceClient';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from 'routing-controllers';
import { Logger, LoggerInterface } from '../../decorators/Logger';

@Service()
export class FaxNotificationService {
    private readonly connection: IORedis.Redis;

    constructor(private partnerClientService: PartnerClientService, @Logger(__filename) private logger: LoggerInterface) {
        admin.initializeApp();
        const redisConfig = {
            sentinels: [
                { host: env.redisConfig.url, port: env.redisConfig.port },
            ],
            password: env.redisConfig.password,
            name: 'mymaster',
            sentinelPassword: env.redisConfig.sentinelPassword,
        };
        this.connection = new IORedis.default(redisConfig);
    }

    public async broadcastNotificationByTopics(partnerId: string, { faxId, userName, topicName, action }: FaxNotificationRequest, token: string): Promise<void> {
        const faxData = await this.connection.get(`${partnerId}-${topicName}`).then(data => JSON.parse(data));
        const message = {
            data: {
                partnerId,
                faxId,
                userName,
                action,
                id: token,
            },
            topic: `${partnerId}-${topicName}`,
        };
        if (faxData && faxData.tokens.indexOf(token) !== -1) {
            await admin.messaging().send(message)
                .then(async (response) => {
                    if (!faxData) {
                        throw new HttpError(StatusCodes.BAD_REQUEST, `Query not matched`);
                    }
                    if (!faxData.tokens) {
                        faxData.tokens = [];
                    }
                    if (!faxData.engagedFaxes) {
                        faxData.engagedFaxes = {};
                    }
                    if (action === 'engage') {
                        faxData.engagedFaxes[faxId] = message.data;
                    } else if (action === 'release') {
                        delete faxData.engagedFaxes[faxId];
                    }
                    this.logger.info('Successfully sent message:', JSON.stringify(response));
                    this.logger.info(`Saved data to redis ${JSON.stringify(faxData)}`);
                    this.connection.set(`${partnerId}-${topicName}`, JSON.stringify(faxData));
                })
                .catch((error) => {
                    this.logger.error('Error sending message:', error);
                    throw new HttpError(StatusCodes.BAD_REQUEST, error);
                });
        } else {
            throw new HttpError(StatusCodes.BAD_REQUEST, 'Data does not exist');
        }
    }

    public async subscribeUser(token: string, partnerId: number, queryParam: FaxNotificationRequest): Promise<void> {
        const groupDetail = await this.partnerClientService.getPartnerNotificationGroup(partnerId, queryParam.topicName);
        if (groupDetail) {
            let faxData = await this.connection.get(`${partnerId}-${queryParam.topicName}`).then(data => JSON.parse(data));
            if (!faxData) {
                faxData = {
                    tokens: [],
                    engagedFaxes: {},
                };
            }
            if (!faxData.tokens) {
                faxData.tokens = [];
            }
            if (!faxData.engagedFaxes) {
                faxData.engagedFaxes = {};
            }

            if (faxData.tokens.indexOf(token) === -1) {
                faxData.tokens.push(token);
                admin.messaging().subscribeToTopic(faxData.tokens, `${partnerId}-${queryParam.topicName}`)
                    .then((response) => {
                        this.logger.info(`Successfully subscribed to topic: ${JSON.stringify(response)}`);
                    })
                    .catch((error) => {
                        this.logger.error(`Error subscribing to topic:', ${error}`);
                    });
                faxData = {
                    tokens: faxData.tokens,
                    engagedFaxes: faxData.engagedFaxes,
                };
                this.logger.info(`Saved data to redis ${JSON.stringify(faxData)}`);
                this.connection.set(`${partnerId}-${queryParam.topicName}`, JSON.stringify(faxData));
            }
            return faxData.engagedFaxes;
        } else {
            throw new HttpError(StatusCodes.BAD_REQUEST, `Query not matched`);
        }
    }

    public async unsubscribeUser(token: string, partnerId: number, queryParam: FaxNotificationRequest): Promise<void> {
        const groupDetail = await this.partnerClientService.getPartnerNotificationGroup(partnerId, queryParam.topicName);
        if (groupDetail) {
            let faxData = await this.connection.get(`${partnerId}-${queryParam.topicName}`).then(data => JSON.parse(data));
            if (!faxData || !faxData.tokens) {
                throw new HttpError(StatusCodes.BAD_REQUEST, `Data does not exist`);
            }
            const tokenAtIndex = faxData.tokens.indexOf(token);
            if (tokenAtIndex !== -1) {
                faxData.tokens.splice(tokenAtIndex, 1);
                for (const [key, value] of Object.entries(faxData.engagedFaxes)) {
                    const faxDetail = value as any;
                    if (faxDetail.id === token) {
                        delete faxData.engagedFaxes[key];
                    }
                }
                admin.messaging().unsubscribeFromTopic(token, `${partnerId}-${queryParam.topicName}`)
                    .then((response) => {
                        this.logger.info(`Successfully unsubscribed to topic: ${JSON.stringify(response)}`);
                    })
                    .catch((error) => {
                        this.logger.error(`Error unsubscribing to topic:', ${error}`);
                    });
                faxData = {
                    tokens: faxData.tokens,
                    engagedFaxes: faxData.engagedFaxes,
                };
                this.logger.info(`Saved data to redis ${JSON.stringify(faxData)}`);
                this.connection.set(`${partnerId}-${queryParam.topicName}`, JSON.stringify(faxData));
            }
            return faxData.engagedFaxes;
        } else {
            throw new HttpError(StatusCodes.BAD_REQUEST, `Query not matched`);
        }
    }
}
