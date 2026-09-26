import { CompanyRepositoryPort } from '../company.ports';

export class FindAllCompaniesUseCase {
  constructor(private readonly repository: CompanyRepositoryPort) {}

  execute(tenantId: string) {
    return this.repository.findAllByTenantId(tenantId);
  }
}
