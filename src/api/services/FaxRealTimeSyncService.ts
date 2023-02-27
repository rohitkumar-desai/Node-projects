import { Service } from 'typedi';
import { HttpError } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { PartnerClientService } from './PartnerServiceClient';
import { RingCentralService } from './RingCentralService';
import { UniteFaxService } from './UniteFaxService';
import { SrFaxService } from './SrFaxService';
import moment from 'moment';
import { env } from '../../env';
import { FaxProvider } from '../models/FaxDetails';
import { PartnerDetails } from '../models/PartnerModel';

@Service()
export class FaxRealTimeSyncService {
    constructor(
        @Logger(__filename) private logger: LoggerInterface,
        private partnerClientService: PartnerClientService,
        private ringCentralService: RingCentralService,
        private uniteFaxService: UniteFaxService,
        private srFaxService: SrFaxService
    ) { }

    // Get all faxes from Unite, SRFAX, RingCentral
    public async fetchFaxDetails(oneDaySync?: boolean): Promise<void> {
        try {
            const partners = await this.partnerClientService.getPartners();
            this.logger.info(`Getting partner details for partner ${partners.id}`);

            await Promise.all(
                partners.map(async (partner: PartnerDetails) => {
                    try {
                        // To Fetch Faxes from SRFAX
                        await this.srFaxService.SrFaxDetails(partner, oneDaySync);
                        // To Fetch Faxes from Unite_Fax
                        await this.uniteFaxService.UniteFaxDetails(partner, undefined, oneDaySync);

                        // To Fetch  Faxes from Ringcentral
                        if (this.faxProviderIntegrated(FaxProvider.RING_CENTRAL)) {
                            await this.ringCentralService.ringCentralFaxDetails(partner);
                        }
                    } catch (err) {
                        this.logger.error(`Getting error while fetching fax data for partner ${partner.id} as ${(err as Error).message}`);
                    }
                }));
        } catch (err) {
            this.logger.error(`Unable to do real time sync for faxes at time range ${moment(new Date())}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `Unable to do real time sync for faxes at time range ${moment(new Date())}`);
        }
    }

    private faxProviderIntegrated(faxProvider: string): boolean {
        if ((faxProvider === FaxProvider.RING_CENTRAL) && env.ringCentralIntegration) {
            return (env.ringCentralIntegration === 'true') ? true : false;
        }
        return true;
    }
}
