import {
  CreateLivestockInput,
  LivestockRecord,
  UpdateLivestockInput,
} from './livestock.types';

export const LIVESTOCK_REPOSITORY = Symbol('LIVESTOCK_REPOSITORY');
export const COMPANY_READER = Symbol('COMPANY_READER');
export const LOT_READER = Symbol('LOT_READER');

export interface LivestockRepositoryPort {
  findAll(): Promise<LivestockRecord[]>;
  findById(id: string): Promise<LivestockRecord | null>;
  findByTagNumber(tagNumber: string): Promise<LivestockRecord | null>;
  create(data: CreateLivestockInput): Promise<LivestockRecord>;
  update(id: string, data: UpdateLivestockInput): Promise<LivestockRecord>;
  delete(id: string): Promise<void>;
}

export interface CompanyReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface LotReaderPort {
  findById(id: string): Promise<{ id: string; companyId: string } | null>;
}
