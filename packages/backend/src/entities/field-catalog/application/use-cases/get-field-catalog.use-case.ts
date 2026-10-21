import { FieldCatalogRepositoryPort } from '../field-catalog.ports';

export class GetFieldCatalogUseCase {
  constructor(private readonly repository: FieldCatalogRepositoryPort) {}

  execute(scope: { tenantId: string; companyId: string }) {
    return this.repository.findCatalog(scope);
  }
}
