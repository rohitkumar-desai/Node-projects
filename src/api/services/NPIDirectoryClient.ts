import axios, { AxiosError } from 'axios';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from 'routing-controllers';
import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { env } from '../../env';
import { ProviderDetailsNPIDirectory } from '../models/ProviderDetailsNPIDirectory';

@Service()
export class NPIDirectoryClient {

    constructor(@Logger(__filename) private logger: LoggerInterface) { }

    public async getProviderFromNPIDirectory(npi: string, partnerId: number): Promise<ProviderDetailsNPIDirectory> {
        this.logger.info(`Fetching Provider Details with ID: ${npi} and partnerId: ${partnerId} from NPI Directory`);

        const data = {
            search: npi,
            provider_code_equality: true,
        };

        try {
            const response = await axios.get(`${env.serviceMesh.npiDirectory.baseUrl}/api/v3/physician`, {
                headers: {
                    'apikey': env.serviceMesh.npiDirectory.apiKey,
                    'x-partner-id': partnerId,
                },
                params: data,
            });

            this.logger.info('The response', response.data);
            return response.data;
        } catch (err) {
            throw new HttpError(StatusCodes.BAD_REQUEST, (err as AxiosError).response.data.message);
        }
    }

}
