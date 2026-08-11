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
  findById(id: string): Promise<WeightRecordRecord | null>;
  create(data: CreateWeightRecordData): Promise<WeightRecordRecord>;
  update(id: string, data: UpdateWeightRecordData): Promise<WeightRecordRecord>;
  delete(id: string): Promise<void>;
}

export interface LivestockReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface UserReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}
