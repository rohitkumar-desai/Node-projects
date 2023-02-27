import { RingCentralConfigResponse } from './RingCentralRingCentralConfigResponseResponse';
import { SrFaxPartnerResponse } from './SrFaxConfigurationResponse';

export class PartnerFaxConfigResponse {
    public faxConfigType: FaxConfigType;
    public ringCentralConfig: RingCentralConfigResponse;
    public srFaxConfig: SrFaxPartnerResponse;
}

export enum FaxConfigType {
    DEFAULT = 'DEFAULT',
    RING_CENTRAL = 'RING_CENTRAL',
    SR_FAX = 'SR_FAX',
    UNITE_FAX = 'UNITE_FAX'
}
