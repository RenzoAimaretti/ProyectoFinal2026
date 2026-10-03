import { EntityNotFoundError } from '../../domain/errors';
import { WeightRecordRepositoryPort } from '../weight-record.ports';
import { WeightRecordRecord } from '../weight-record.types';

export class FindWeightRecordUseCase {
  constructor(private readonly repository: WeightRecordRepositoryPort) {}

  execute(id: string, companyId?: string): Promise<WeightRecordRecord | null> {
    if (!companyId) {
      return this.repository.findById(id);
    }

    return this.repository.findByIdForCompany(id, companyId).then((record) => {
      if (!record) {
        throw new EntityNotFoundError(`Weight record with id ${id} not found`);
      }

      return record;
    });
  }
}
