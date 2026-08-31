import { EntityNotFoundError } from '../../domain/errors';
import { FarmRepositoryPort } from '../farm.ports';
import { FarmRecord } from '../farm.types';

export class FindFarmUseCase {
  constructor(private readonly repository: FarmRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<FarmRecord> {
    const farm = await this.repository.findByIdForCompany(id, companyId);

    if (!farm) {
      throw new EntityNotFoundError(`Farm with id ${id} not found`);
    }

    return farm;
  }
}
