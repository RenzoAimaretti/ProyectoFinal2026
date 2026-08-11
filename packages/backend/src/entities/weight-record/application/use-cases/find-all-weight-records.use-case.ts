import { WeightRecordRepositoryPort } from '../weight-record.ports';
import { WeightRecordRecord } from '../weight-record.types';

export class FindAllWeightRecordsUseCase {
  constructor(private readonly repository: WeightRecordRepositoryPort) {}

  execute(): Promise<WeightRecordRecord[]> {
    return this.repository.findAll();
  }
}
