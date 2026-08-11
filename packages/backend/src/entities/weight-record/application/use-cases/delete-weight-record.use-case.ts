import { EntityNotFoundError } from '../../domain/errors';
import { WeightRecordRepositoryPort } from '../weight-record.ports';
import { RemoveWeightRecordOutput } from '../weight-record.types';

export class DeleteWeightRecordUseCase {
  constructor(private readonly repository: WeightRecordRepositoryPort) {}

  async execute(id: string): Promise<RemoveWeightRecordOutput> {
    const record = await this.repository.findById(id);

    if (!record) {
      throw new EntityNotFoundError(`Weight record with id ${id} not found`);
    }

    await this.repository.delete(id);

    return { message: `Weight record with id ${id} deleted successfully` };
  }
}
