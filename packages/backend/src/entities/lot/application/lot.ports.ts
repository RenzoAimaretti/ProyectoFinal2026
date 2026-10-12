import { LotHistory } from '../domain/lot-state';
import { CreateLotInput, LotRecord, UpdateLotInput } from './lot.types';

export const LOT_REPOSITORY = Symbol('LOT_REPOSITORY');
export const FARM_READER = Symbol('FARM_READER');
export const LOT_HISTORY_READER = Symbol('LOT_HISTORY_READER');

export type LotHistoryByLotId = Map<string, LotHistory>;

/** Reads what actually happened on a lot, which is what its state is derived from. */
export interface LotHistoryReaderPort {
  findHistoryByLotIds(lotIds: readonly string[]): Promise<LotHistoryByLotId>;
}

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
