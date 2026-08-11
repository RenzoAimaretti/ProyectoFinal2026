import { EntityNotFoundError } from '../../domain/errors';
import { LivestockRepositoryPort } from '../livestock.ports';
import { LivestockRecord } from '../livestock.types';

export class FindLivestockUseCase {
  constructor(private readonly repository: LivestockRepositoryPort) {}

  async execute(id: string): Promise<LivestockRecord> {
    const livestock = await this.repository.findById(id);

    if (!livestock) {
      throw new EntityNotFoundError(`Livestock with id ${id} not found`);
    }

    return livestock;
  }
}
