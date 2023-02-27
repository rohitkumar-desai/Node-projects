import { EntityRepository, Repository } from 'typeorm';
import { FaxDetailEntity } from '../entities/FaxDetailEntity';

@EntityRepository(FaxDetailEntity)
export class FaxDetailRepo  extends Repository<FaxDetailEntity> {
}
