import {
  CreateWeightRecordData,
  RemoveWeightRecordOutput,
  UpdateWeightRecordData,
  WeightRecordRecord,
} from './weight-record.types';

export const WEIGHT_RECORD_REPOSITORY = Symbol('WEIGHT_RECORD_REPOSITORY');
export const LIVESTOCK_READER = Symbol('WEIGHT_RECORD_LIVESTOCK_READER');
export const USER_READER = Symbol('WEIGHT_RECORD_USER_READER');

export interface WeightRecordRepositoryPort {
  findAll(): Promise<WeightRecordRecord[]>;
  findAllByCompanyId(companyId: string): Promise<WeightRecordRecord[]>;
  findById(id: string): Promise<WeightRecordRecord | null>;
  findByIdForCompany(id: string, companyId: string): Promise<WeightRecordRecord | null>;
  create(data: CreateWeightRecordData): Promise<WeightRecordRecord>;
  update(id: string, data: UpdateWeightRecordData): Promise<WeightRecordRecord>;
  updateForCompany(
    id: string,
    companyId: string,
    data: UpdateWeightRecordData,
  ): Promise<WeightRecordRecord>;
  delete(id: string): Promise<void>;
  deleteForCompany(id: string, companyId: string): Promise<void>;
}

export interface LivestockReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
  findByIdForCompany(id: string, companyId: string): Promise<{ id: string } | null>;
}

export interface UserReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
  findByIdForCompany(id: string, companyId: string): Promise<{ id: string } | null>;
}
