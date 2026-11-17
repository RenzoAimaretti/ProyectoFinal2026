export const LABOR_TYPE_CATEGORY_REPOSITORY = Symbol('LABOR_TYPE_CATEGORY_REPOSITORY');
export const LABOR_TYPE_INPUT_CATEGORY_READER = Symbol('LABOR_TYPE_INPUT_CATEGORY_READER');

export type LaborTypeCategoryRecord = {
  id: string;
  tenantId: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

export interface LaborTypeCategoryRepositoryPort {
  findLaborTypeForTenant(id: string, tenantId: string): Promise<{ id: string } | null>;
  findCategoriesForLaborType(id: string, tenantId: string): Promise<LaborTypeCategoryRecord[]>;
  replaceCategoriesForTenant(id: string, tenantId: string, categoryIds: string[]): Promise<void>;
}

export interface LaborTypeInputCategoryReaderPort {
  findByIdsForTenant(ids: string[], tenantId: string): Promise<Array<{ id: string }>>;
}
