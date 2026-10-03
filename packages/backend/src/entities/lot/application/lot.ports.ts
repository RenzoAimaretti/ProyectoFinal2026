import { CreateLotInput, LotRecord, UpdateLotInput } from './lot.types';

export const LOT_REPOSITORY = Symbol('LOT_REPOSITORY');
export const FARM_READER = Symbol('FARM_READER');

export interface LotRepositoryPort {
  findAllByTenantId(tenantId: string): Promise<LotRecord[]>;
  findAllByClientId(clientId: string): Promise<LotRecord[]>;
  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<LotRecord | null>;
  findByNameAndFarmId(name: string, farmId: string): Promise<LotRecord | null>;
  create(data: CreateLotInput): Promise<LotRecord>;
  updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateLotInput,
  ): Promise<LotRecord>;
}

export interface FarmReaderPort {
  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<{ id: string } | null>;
}
