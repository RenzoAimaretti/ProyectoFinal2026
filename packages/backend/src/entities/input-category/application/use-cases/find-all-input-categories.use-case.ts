import { InputCategoryRepositoryPort } from '../input-category.ports';
export class FindAllInputCategoriesUseCase {
  constructor(private readonly repository: InputCategoryRepositoryPort) {}
  execute(tenantId: string) { return this.repository.findAllByTenantId(tenantId); }
}
