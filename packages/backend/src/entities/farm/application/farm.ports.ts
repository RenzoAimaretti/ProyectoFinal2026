import { CreateFarmInput, FarmRecord, UpdateFarmInput } from './farm.types';

export const FARM_REPOSITORY = Symbol('FARM_REPOSITORY');
export const COMPANY_READER = Symbol('COMPANY_READER');

export interface FarmRepositoryPort {
  findAll(): Promise<FarmRecord[]>;
  findById(id: string): Promise<FarmRecord | null>;
  findByNameAndCompanyId(
    name: string,
    companyId: string,
  ): Promise<FarmRecord | null>;
  create(data: CreateFarmInput): Promise<FarmRecord>;
  update(id: string, data: UpdateFarmInput): Promise<FarmRecord>;
}

export interface CompanyReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}
