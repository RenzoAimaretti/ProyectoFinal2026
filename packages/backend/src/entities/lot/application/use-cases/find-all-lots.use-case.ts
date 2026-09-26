import { LotRepositoryPort } from '../lot.ports';
import { LotRecord } from '../lot.types';

export class FindAllLotsUseCase {
  constructor(private readonly repository: LotRepositoryPort) {}

  async execute(tenantId: string): Promise<LotRecord[]> {
    return this.repository.findAllByTenantId(tenantId);
  }
}
