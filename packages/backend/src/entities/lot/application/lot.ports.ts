import { CreateLotInput, LotRecord, UpdateLotInput } from './lot.types';

export const LOT_REPOSITORY = Symbol('LOT_REPOSITORY');
export const FARM_READER = Symbol('FARM_READER');

export interface LotRepositoryPort {
  findAll(): Promise<LotRecord[]>;
  findById(id: string): Promise<LotRecord | null>;
  findByNameAndFarmId(name: string, farmId: string): Promise<LotRecord | null>;
  create(data: CreateLotInput): Promise<LotRecord>;
  update(id: string, data: UpdateLotInput): Promise<LotRecord>;
}

export interface FarmReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}
