import { WeightRecordRepositoryPort } from '../weight-record.ports';
import { WeightRecordRecord } from '../weight-record.types';

export class FindWeightRecordUseCase {
  constructor(private readonly repository: WeightRecordRepositoryPort) {}

  execute(id: string): Promise<WeightRecordRecord | null> {
    return this.repository.findById(id);
  }
}
