import { LivestockMovementRepositoryPort } from '../livestock-movement.ports';
import { LivestockMovementRecord } from '../livestock-movement.types';

export class FindAllLivestockMovementsUseCase {
  constructor(private readonly repository: LivestockMovementRepositoryPort) {}

  async execute(companyId: string): Promise<LivestockMovementRecord[]> {
    return this.repository.findAllByCompanyId(companyId);
  }
}
