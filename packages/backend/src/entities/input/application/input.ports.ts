import { CreateInputData, InputRecord, UpdateInputInput } from './input.types';

export const INPUT_REPOSITORY = Symbol('INPUT_REPOSITORY');
export const INPUT_STOCK_READER = Symbol('INPUT_STOCK_READER');

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

/**
 * Narrow cross-entity read used by the unit-change guard: report whether the
 * input still backs a stock balance with a non-zero quantity. The input id is
 * resolved inside the tenant scope by the use case before this port is called.
 */
export interface InputStockReaderPort {
  hasNonZeroBalance(inputId: string): Promise<boolean>;
}
