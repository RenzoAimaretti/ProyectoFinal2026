import { EntityNotFoundError } from '../../domain/errors';
import { LotRepositoryPort } from '../lot.ports';

export class DeleteLotUseCase {
  constructor(private readonly repository: LotRepositoryPort) {}

  async execute(id: string, tenantId: string): Promise<void> {
    // The adapter locks, checks and deletes atomically. An earlier read cannot
    // authorize deletion because references can arrive between queries.
    if (!(await this.repository.deleteForTenant(id, tenantId))) {
      throw new EntityNotFoundError(`Lot with id ${id} not found`);
    }
  }
}
