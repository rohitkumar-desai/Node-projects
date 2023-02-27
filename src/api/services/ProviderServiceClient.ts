import { env } from '../../env';
import { Service } from 'typedi';
import axios, { AxiosError } from 'axios';
import { HttpError } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { ProviderDetailsByNPI } from '../models/ProviderDetailsByNPI';

@Service()
export class ProviderServiceClient {

    constructor(@Logger(__filename) private logger: LoggerInterface) { }

    public async getProviderDetailsByNPI(npi: string, partnerId: number): Promise<ProviderDetailsByNPI> {
        this.logger.info(`Fetching Provider Details for NPI:${npi} and Partner Id: ${partnerId}`);

        try {
            const response = await axios.get(`${env.serviceMesh.provider.baseUrl}/${npi}/detail`, {
                headers: {
                    'apikey': env.serviceMesh.apiKey,
                    'x-partner-id': partnerId,
                },
            });
            return response.data;
        } catch (err) {
            throw new HttpError(StatusCodes.BAD_REQUEST, (err as AxiosError).response.data.message);
        }

    }

}
