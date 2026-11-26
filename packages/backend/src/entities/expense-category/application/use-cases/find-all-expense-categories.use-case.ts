import { ExpenseCategoryRepositoryPort } from '../expense-category.ports';
import { ExpenseCategoryRecord } from '../expense-category.types';

export class FindAllExpenseCategoriesUseCase {
  constructor(private readonly repository: ExpenseCategoryRepositoryPort) {}

  execute(tenantId: string): Promise<ExpenseCategoryRecord[]> {
    return this.repository.findAllByTenantId(tenantId);
  }
}
