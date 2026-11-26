import {
  ExpenseCategoryRecord,
  UpdateExpenseCategoryInput,
} from './expense-category.types';

export const EXPENSE_CATEGORY_REPOSITORY = Symbol(
  'EXPENSE_CATEGORY_REPOSITORY',
);

export interface ExpenseCategoryRepositoryPort {
  findAllByTenantId(tenantId: string): Promise<ExpenseCategoryRecord[]>;
  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<ExpenseCategoryRecord | null>;
  findByNameAndTenantId(
    name: string,
    tenantId: string,
  ): Promise<ExpenseCategoryRecord | null>;
  create(data: {
    tenantId: string;
    name: string;
  }): Promise<ExpenseCategoryRecord>;
  updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateExpenseCategoryInput,
  ): Promise<ExpenseCategoryRecord>;
  deleteForTenant(id: string, tenantId: string): Promise<void>;
  /** True when any expense, soft-deleted ones included, references the category. */
  hasExpenses(id: string, tenantId: string): Promise<boolean>;
}
