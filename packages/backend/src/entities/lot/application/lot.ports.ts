import { CreateLotInput, LotRecord, UpdateLotInput } from './lot.types';

export const LOT_REPOSITORY = Symbol('LOT_REPOSITORY');
export const FARM_READER = Symbol('FARM_READER');

export interface LotRepositoryPort {
  findAllByCompanyId(companyId: string): Promise<LotRecord[]>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<LotRecord | null>;
  findByNameAndFarmId(name: string, farmId: string): Promise<LotRecord | null>;
  create(data: CreateLotInput): Promise<LotRecord>;
  updateForCompany(
    id: string,
    companyId: string,
    data: UpdateLotInput,
  ): Promise<LotRecord>;
}

export interface FarmReaderPort {
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<{ id: string } | null>;
}
