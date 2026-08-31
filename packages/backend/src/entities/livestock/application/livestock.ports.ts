import {
  CreateLivestockInput,
  LivestockRecord,
  UpdateLivestockInput,
} from './livestock.types';

export const LIVESTOCK_REPOSITORY = Symbol('LIVESTOCK_REPOSITORY');
export const COMPANY_READER = Symbol('COMPANY_READER');
export const LOT_READER = Symbol('LOT_READER');

export interface LivestockRepositoryPort {
  findAllByCompanyId(companyId: string): Promise<LivestockRecord[]>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<LivestockRecord | null>;
  findByTagNumberAndCompanyId(
    tagNumber: string,
    companyId: string,
  ): Promise<LivestockRecord | null>;
  create(data: CreateLivestockInput & { companyId: string }): Promise<LivestockRecord>;
  updateForCompany(
    id: string,
    companyId: string,
    data: UpdateLivestockInput,
  ): Promise<LivestockRecord>;
  deleteForCompany(id: string, companyId: string): Promise<void>;
}

export interface CompanyReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface LotReaderPort {
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<{ id: string; companyId: string } | null>;
}
