export interface ExpenseCategoryRecord {
  id: string;
  tenantId: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateExpenseCategoryInput {
  name?: string;
  active?: boolean;
}
