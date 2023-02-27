import Axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from 'routing-controllers';
import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { env } from '../../env';
import { InboxHL7Message, InboxHL7Patch } from '../models/InboxMessage';

@Service()
export class InboxServiceClient {

    constructor(@Logger(__filename) private logger: LoggerInterface) { }

    public async getByReferralId(partnerId: number, referralId: number): Promise<InboxHL7Message> {
        try {
            const response = await Axios.get(`${env.serviceMesh.inbox.baseUrl}/hl7?referralId=${referralId}`,
                {
                    headers: {
                        'x-partner-id': partnerId,
                        'apiKey': env.serviceMesh.apiKey,
                    },
                });

            this.logger.info(`Fetched the Inbox Message for referral Id: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (e) {
            this.logger.error(`Unable to fetch the Inbox Message for referral Id: ${referralId}, Error: ${JSON.stringify(e)}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, (e as Error).message);
        }
    }

    public async updateHl7Status(partnerId: number, inboxPatch: InboxHL7Patch): Promise<void> {
        try {
            await Axios.patch(`${env.serviceMesh.inbox.baseUrl}/hl7`, inboxPatch,
                {
                    headers: {
                        'x-partner-id': partnerId,
                        'apiKey': env.serviceMesh.apiKey,
                    },
                });

            this.logger.info(`Successfully updated the HL7 message status`);
        } catch (e) {
            this.logger.error(`error : ${JSON.stringify(e)}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, (e as Error).message);
        }
    }

}
