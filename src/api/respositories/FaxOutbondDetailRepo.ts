import { EntityRepository, Repository } from 'typeorm';
import { FaxOutboundDetailEntity } from '../entities/FaxOutbondDetailEntity';

@EntityRepository(FaxOutboundDetailEntity)
export class FaxOutboundDetailRepo extends Repository<FaxOutboundDetailEntity> {
}
