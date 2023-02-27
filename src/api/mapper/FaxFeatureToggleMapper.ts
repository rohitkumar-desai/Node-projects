import { Builder } from 'builder-pattern';
import { Service } from 'typedi';
import { FaxDetailEntity } from '../entities/FaxDetailEntity';
import { FaxDetail } from '../models/FaxDetails';

@Service()
export class FaxFeatureToggleMapper {
    public toFeatureToggleEntity(data: FaxDetail, partnerId: number): FaxDetailEntity {
        return Builder(FaxDetailEntity)
            .partnerId(partnerId)
            .fromFaxNumber(data.CallerID)
            .pages(data.Pages)
            .recipientFaxNumber(data.User_FaxNumber)
            .build();
    }

}
