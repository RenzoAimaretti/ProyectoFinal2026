import { FarmRepositoryPort } from '../farm.ports';
import { FarmRecord } from '../farm.types';

export class FindAllFarmsUseCase {
  constructor(private readonly repository: FarmRepositoryPort) {}

  execute(tenantId: string): Promise<FarmRecord[]> {
    return this.repository.findAllByTenantId(tenantId);
  }
}
