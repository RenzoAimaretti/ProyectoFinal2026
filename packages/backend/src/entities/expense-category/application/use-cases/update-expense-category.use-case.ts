import { DuplicateEntityError, EntityNotFoundError } from '../../domain/errors';
import { ExpenseCategoryRepositoryPort } from '../expense-category.ports';
import {
  ExpenseCategoryRecord,
  UpdateExpenseCategoryInput,
} from '../expense-category.types';
import { updatePayload } from '../expense-category.validation';

export class UpdateExpenseCategoryUseCase {
  constructor(private readonly repository: ExpenseCategoryRepositoryPort) {}

  async execute(
    id: string,
    tenantId: string,
    input: UpdateExpenseCategoryInput,
  ): Promise<ExpenseCategoryRecord> {
    const data = updatePayload(input);
    const existing = await this.repository.findByIdForTenant(id, tenantId);
    if (!existing) throw new EntityNotFoundError('Expense category not found');

    if (data.name !== undefined && data.name !== existing.name) {
      const duplicate = await this.repository.findByNameAndTenantId(
        data.name,
        tenantId,
      );
      if (duplicate && duplicate.id !== id) {
        throw new DuplicateEntityError('Expense category already exists');
      }
    }
    return this.repository.updateForTenant(id, tenantId, data);
  }
}
