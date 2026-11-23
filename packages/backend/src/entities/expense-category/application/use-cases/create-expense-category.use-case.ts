import { DuplicateEntityError } from '../../domain/errors';
import { ExpenseCategoryRepositoryPort } from '../expense-category.ports';
import { ExpenseCategoryRecord } from '../expense-category.types';
import { requiredName } from '../expense-category.validation';

export class CreateExpenseCategoryUseCase {
  constructor(private readonly repository: ExpenseCategoryRepositoryPort) {}

  async execute(
    tenantId: string,
    input: { name: string },
  ): Promise<ExpenseCategoryRecord> {
    const name = requiredName(input?.name);
    if (await this.repository.findByNameAndTenantId(name, tenantId)) {
      throw new DuplicateEntityError('Expense category already exists');
    }
    return this.repository.create({ tenantId, name });
  }
}
