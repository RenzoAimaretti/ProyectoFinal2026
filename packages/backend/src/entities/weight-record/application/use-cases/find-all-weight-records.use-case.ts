import { WeightRecordRepositoryPort } from '../weight-record.ports';
import { WeightRecordRecord } from '../weight-record.types';

export class FindAllWeightRecordsUseCase {
  constructor(private readonly repository: WeightRecordRepositoryPort) {}

  execute(companyId?: string): Promise<WeightRecordRecord[]> {
    if (!companyId) {
      return this.repository.findAll();
    }

    return this.repository.findAllByCompanyId(companyId);
  }
}
