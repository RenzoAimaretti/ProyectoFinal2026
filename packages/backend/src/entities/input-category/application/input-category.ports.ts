import { InputCategoryRecord, UpdateInputCategoryInput } from './input-category.types';
export const INPUT_CATEGORY_REPOSITORY = Symbol('INPUT_CATEGORY_REPOSITORY');
export interface InputCategoryRepositoryPort {
  findAllByTenantId(tenantId: string): Promise<InputCategoryRecord[]>;
  findByIdForTenant(id: string, tenantId: string): Promise<InputCategoryRecord | null>;
  findByNameAndTenantId(name: string, tenantId: string): Promise<InputCategoryRecord | null>;
  create(data: { tenantId: string; name: string }): Promise<InputCategoryRecord>;
  updateForTenant(id: string, tenantId: string, data: UpdateInputCategoryInput): Promise<InputCategoryRecord>;
  deleteForTenant(id: string, tenantId: string): Promise<void>;
  hasInputs(id: string, tenantId: string): Promise<boolean>;
}
