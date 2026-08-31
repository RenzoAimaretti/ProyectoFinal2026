import { EntityNotFoundError } from '../../domain/errors';
import { LivestockMovementRepositoryPort } from '../livestock-movement.ports';
import { LivestockMovementRecord } from '../livestock-movement.types';

export class FindLivestockMovementUseCase {
  constructor(private readonly repository: LivestockMovementRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<LivestockMovementRecord> {
    const movement = await this.repository.findByIdForCompany(id, companyId);

    if (!movement) {
      throw new EntityNotFoundError(`Livestock movement with id ${id} not found`);
    }

    return movement;
  }
}
