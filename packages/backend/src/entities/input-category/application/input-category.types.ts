export type InputCategoryRecord = {
  id: string; tenantId: string; name: string; active: boolean;
  createdAt: Date; updatedAt: Date; version: number; deleted: boolean;
};
export type CreateInputCategoryInput = { name: string };
export type UpdateInputCategoryInput = { name?: string; active?: boolean };
