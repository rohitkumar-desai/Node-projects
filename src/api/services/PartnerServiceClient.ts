import { env } from '../../env';
import { Service } from 'typedi';
import axios, { AxiosError } from 'axios';
import { HttpError } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import { PartnerNotificationGroup } from '../models/PartnerNotificationGroups';
import { SrFaxPartnerResponse } from '../controllers/responses/SrFaxConfigurationResponse';
import { RingCentralConfig } from '../controllers/requests/RingCentralParams';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { RingCentralConfigResponse } from '../controllers/responses/RingCentralRingCentralConfigResponseResponse';
import { PartnerFaxConfigResponse } from '../controllers/responses/PartnerFaxConfigResponse';
import { PartnerDetails } from '../models/PartnerModel';
import { Builder } from 'builder-pattern';

@Service()
export class PartnerClientService {

    constructor(@Logger(__filename) private logger: LoggerInterface) { }

    public async getPartnerNotificationGroup(partnerId: number, topicName: string): Promise<PartnerNotificationGroup> {
        try {
            const response = await axios.get(`${env.serviceMesh.partner.baseUrl}/notification-group`, {
                headers: {
                    'apikey': env.serviceMesh.apiKey,
                    'x-client-name': env.serviceMesh.partner.clientName,
                    'x-client-secret': env.serviceMesh.partner.clientSecret,
                    'x-partner-id': partnerId,
                },
                params: {
                    topicName,
                },
            });
            return response.data;
        } catch (err) {
            throw new HttpError(StatusCodes.BAD_REQUEST, (err as AxiosError).response.data.message);
        }
    }
    public async getPartnerSrFaxConfig(partnerId: number): Promise<SrFaxPartnerResponse> {
        const response = await axios.get(`${env.serviceMesh.partner.baseUrl}/srfax/config`, {
            headers: {
                'apikey': env.serviceMesh.apiKey,
                'x-client-name': env.serviceMesh.partner.clientName,
                'x-client-secret': env.serviceMesh.partner.clientSecret,
                'x-partner-id': partnerId,
            },
        });
        return response.data;
    }

    public async getPartnerRingCentralConfig(partnerId: number): Promise<RingCentralConfigResponse> {
        const response = await axios.get(`${env.serviceMesh.partner.baseUrl}/ring-central/config`, {
            headers: {
                'apikey': env.serviceMesh.apiKey,
                'x-client-name': env.serviceMesh.partner.clientName,
                'x-client-secret': env.serviceMesh.partner.clientSecret,
                'x-partner-id': partnerId,
            },
        });
        return response.data;
    }

    // Fetch a configured or default fax for a partner
    public async getPartnerFaxConfig(partnerId: number): Promise<PartnerFaxConfigResponse> {
        const response = await axios.get(`${env.serviceMesh.partner.baseUrl}/fax/config`, {
            headers: {
                'apikey': env.serviceMesh.apiKey,
                'x-client-name': env.serviceMesh.partner.clientName,
                'x-client-secret': env.serviceMesh.partner.clientSecret,
                'x-partner-id': partnerId,
            },
        });
        return response.data;
    }

    public async getPartnerTimeZone(partnerId: number): Promise<any> {
        const response = await axios.get(`${env.serviceMesh.partner.baseUrl}`, {
            headers: {
                'apikey': env.serviceMesh.apiKey,
                'x-client-name': env.serviceMesh.partner.clientName,
                'x-client-secret': env.serviceMesh.partner.clientSecret,
                'x-partner-id': partnerId,
            },
        });
        return response.data;
    }

    public async getPartnerConfig(partnerId: number): Promise<any> {
        const response = await axios.get(`${env.serviceMesh.partner.baseUrl}`, {
            headers: {
                'apikey': env.serviceMesh.apiKey,
                'x-client-name': env.serviceMesh.partner.clientName,
                'x-client-secret': env.serviceMesh.partner.clientSecret,
                'x-partner-id': partnerId,
            },
        });
        return response.data;
    }

    public async getPartners(): Promise<any> {
        const response = await axios.get(`${env.serviceMesh.partner.baseUrl}`, {
            headers: {
                'apikey': env.serviceMesh.apiKey,
                'x-client-name': env.serviceMesh.partner.clientName,
                'x-client-secret': env.serviceMesh.partner.clientSecret,
            },
        });
        return response.data;
    }

    // Get feature-toggle value for given partner
    public async getPartnerFeatureToggle(partnerId: number): Promise<any> {
        const response = await axios.get(`${env.serviceMesh.partner.baseUrl}/feature-toggle`, {
            headers: {
                'apikey': env.serviceMesh.apiKey,
                'x-client-name': env.serviceMesh.partner.clientName,
                'x-client-secret': env.serviceMesh.partner.clientSecret,
                'x-partner-id': partnerId,
            },
        });
        return response.data;
    }

    public async saveUpdatedToken(partnerId: number, ringCentralConfig: RingCentralConfig, id: number): Promise<any> {
        const response = await axios.patch(`${env.serviceMesh.partner.baseUrl}/ring-central/config?id=${id}`, ringCentralConfig,
            {
                headers: {
                    'apikey': env.serviceMesh.apiKey,
                    'x-client-name': env.serviceMesh.partner.clientName,
                    'x-client-secret': env.serviceMesh.partner.clientSecret,
                    'x-partner-id': partnerId,
                },
            });
        this.logger.info(`Token Updated successfully  :  ${JSON.stringify(response.data)}`);
        return response.data;
    }

    public async getUniteFaxConfig(partnerId: number): Promise<any> {
        const response = await axios.get(`${env.serviceMesh.partner.baseUrl}/unite-fax/config`, {
            headers: {
                'apikey': env.serviceMesh.apiKey,
                'x-client-name': env.serviceMesh.partner.clientName,
                'x-client-secret': env.serviceMesh.partner.clientSecret,
                'x-partner-id': partnerId,
            },
        });
        return response.data;
    }
    public async getPartnerDetail(partnerId: number): Promise<PartnerDetails> {
        try {
        this.logger.info(`Fetching partner details from Partner service for partnerId ${partnerId}`);
        const response = await axios.get(`${env.serviceMesh.partner.baseUrl}`, {
            headers: {
                'apikey': env.serviceMesh.apiKey,
                'x-client-name': env.serviceMesh.partner.clientName,
                'x-client-secret': env.serviceMesh.partner.clientSecret,
                'x-partner-id': partnerId,
            },
        });
        this.logger.info(`partner details Partner service for partnerId ${partnerId} fetched successfully`);

        return Object.assign(Builder(PartnerDetails).build(), response.data);
    } catch (error) {
        this.logger.error(`Error while fetching partner details from Partner service for partnerId ${partnerId}, getting error as ${(error as Error).message}`);
        throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `Getting error while fetching partner details from partner service for partnerId ${partnerId}`);
    }
    }
}
