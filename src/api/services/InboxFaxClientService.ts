import Axios from 'axios';
import { env } from '../../env';
import { FaxDetailEntity } from '../entities/FaxDetailEntity';
import { Logger, LoggerInterface } from '../../decorators/Logger';
export class InboxFaxServiceClient {
    constructor(@Logger(__filename) private logger: LoggerInterface) { }

    public async addFaxes(faxDetail: FaxDetailEntity[], partnerId: number): Promise<void> {
        try {
            await Axios.post(`${env.serviceMesh.inbox.baseUrl}/fax`, faxDetail, {
                headers: {
                    'x-partner-id': partnerId,
                    'apiKey': env.serviceMesh.apiKey,
                },
            });
        } catch (err) {
            this.logger.error(`Error adding faxes to Inbox service ${JSON.stringify(faxDetail)} | PartnerId ${partnerId} | ${JSON.stringify(err)} `);
        }

    }
}
