import { CategoryInUseError, EntityNotFoundError } from '../../domain/errors';
import { ExpenseCategoryRepositoryPort } from '../expense-category.ports';

export class DeleteExpenseCategoryUseCase {
  constructor(private readonly repository: ExpenseCategoryRepositoryPort) {}

  async execute(id: string, tenantId: string): Promise<{ message: string }> {
    if (!(await this.repository.findByIdForTenant(id, tenantId))) {
      throw new EntityNotFoundError('Expense category not found');
    }
    if (await this.repository.hasExpenses(id, tenantId)) {
      throw new CategoryInUseError('Expense category still has expenses');
    }
    await this.repository.deleteForTenant(id, tenantId);
    return { message: `Expense category with id ${id} deleted successfully` };
  }
}
