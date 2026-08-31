import { EntityNotFoundError } from '../../domain/errors';
import { LotRepositoryPort } from '../lot.ports';
import { LotRecord } from '../lot.types';

export class FindLotUseCase {
  constructor(private readonly repository: LotRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<LotRecord> {
    const lot = await this.repository.findByIdForCompany(id, companyId);

    if (!lot) {
      throw new EntityNotFoundError(`Lot with id ${id} not found`);
    }

    return lot;
  }
}
