import { CreateFarmInput, FarmRecord, UpdateFarmInput } from './farm.types';

export const FARM_REPOSITORY = Symbol('FARM_REPOSITORY');
export const COMPANY_READER = Symbol('COMPANY_READER');

export interface FarmRepositoryPort {
  findAllByCompanyId(companyId: string): Promise<FarmRecord[]>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<FarmRecord | null>;
  findByNameAndCompanyId(
    name: string,
    companyId: string,
  ): Promise<FarmRecord | null>;
  create(data: CreateFarmInput & { companyId: string }): Promise<FarmRecord>;
  updateForCompany(
    id: string,
    companyId: string,
    data: UpdateFarmInput,
  ): Promise<FarmRecord>;
}

export interface CompanyReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}
