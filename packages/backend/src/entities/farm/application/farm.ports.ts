import { CreateFarmInput, FarmRecord, UpdateFarmInput } from './farm.types';

export const FARM_REPOSITORY = Symbol('FARM_REPOSITORY');
export const CLIENT_READER = Symbol('CLIENT_READER');

export interface FarmRepositoryPort {
  findAllByTenantId(tenantId: string): Promise<FarmRecord[]>;
  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<FarmRecord | null>;
  findByNameAndClientId(
    name: string,
    clientId: string,
  ): Promise<FarmRecord | null>;
  create(data: CreateFarmInput & { clientId: string }): Promise<FarmRecord>;
  updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateFarmInput,
  ): Promise<FarmRecord>;
}

export interface ClientReaderPort {
  findByIdForTenant(id: string, tenantId: string): Promise<{ id: string } | null>;
}
