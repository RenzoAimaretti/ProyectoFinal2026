import { CreateInputData, InputRecord, UpdateInputInput } from './input.types';

export const INPUT_REPOSITORY = Symbol('INPUT_REPOSITORY');

export interface InputRepositoryPort {
  findAllByTenantId(tenantId: string): Promise<InputRecord[]>;
  findByIdForTenant(id: string, tenantId: string): Promise<InputRecord | null>;
  findByNameAndTenantId(
    name: string,
    tenantId: string,
  ): Promise<InputRecord | null>;
  create(data: CreateInputData): Promise<InputRecord>;
  updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateInputInput,
  ): Promise<InputRecord>;
}
