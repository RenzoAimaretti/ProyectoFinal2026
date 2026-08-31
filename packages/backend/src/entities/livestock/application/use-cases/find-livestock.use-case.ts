import { EntityNotFoundError } from '../../domain/errors';
import { LivestockRepositoryPort } from '../livestock.ports';
import { LivestockRecord } from '../livestock.types';

export class FindLivestockUseCase {
  constructor(private readonly repository: LivestockRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<LivestockRecord> {
    const livestock = await this.repository.findByIdForCompany(id, companyId);

    if (!livestock) {
      throw new EntityNotFoundError(`Livestock with id ${id} not found`);
    }

    return livestock;
  }
}
