import { LaborTypeRepositoryPort } from '../labor-type.ports';

export class FindAllLaborTypesUseCase {
  constructor(private readonly repository: LaborTypeRepositoryPort) {}

  execute(tenantId: string) {
    return this.repository.findAllByTenantId(tenantId);
  }
}
