import axios, { AxiosError } from 'axios';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from 'routing-controllers';
import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { env } from '../../env';
import { ReferralPatch } from '../models/ReferralDetail';

@Service()
export class ReferralServiceClient {

    constructor(@Logger(__filename) private logger: LoggerInterface) { }

    public async updateReferralStatus(partnerId: number, referralPatch: ReferralPatch): Promise<void> {
        this.logger.info(`Updating referral status with patch: ${JSON.stringify(referralPatch)}`);

        try {
            await axios.patch(`${env.serviceMesh.referral.baseUrl}/V2/active`, referralPatch, {
                headers: {
                    'x-partner-id': partnerId,
                    'apiKey': env.serviceMesh.apiKey,
                },
            });

            this.logger.info(`Successfully updated the referral status.`);
        } catch (error) {
            this.logger.error(`Unable to update the referral status for patch: ${JSON.stringify(referralPatch)}. Error: ${JSON.stringify((error as AxiosError).message)}`);
            throw new HttpError(StatusCodes.BAD_REQUEST, (error as Error).message);
        }
    }

}
