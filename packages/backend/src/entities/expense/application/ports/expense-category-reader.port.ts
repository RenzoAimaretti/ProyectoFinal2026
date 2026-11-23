export const EXPENSE_CATEGORY_READER = Symbol('EXPENSE_CATEGORY_READER');

export interface ExpenseCategoryReaderPort {
  /** La categoria debe pertenecer al tenant; `active` lo decide el caso de uso. */
  findInTenant(
    categoryId: string,
    tenantId: string,
  ): Promise<{ id: string; active: boolean } | null>;
}
