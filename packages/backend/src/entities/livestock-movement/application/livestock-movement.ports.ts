import {
  CreateLivestockMovementData,
  LivestockMovementRecord,
} from './livestock-movement.types';

export const LIVESTOCK_MOVEMENT_REPOSITORY = Symbol('LIVESTOCK_MOVEMENT_REPOSITORY');
export const LIVESTOCK_READER = Symbol('LIVESTOCK_MOVEMENT_LIVESTOCK_READER');
export const LOT_READER = Symbol('LIVESTOCK_MOVEMENT_LOT_READER');

export interface LivestockMovementRepositoryPort {
  findAllByCompanyId(companyId: string): Promise<LivestockMovementRecord[]>;
  findByIdForCompany(id: string, companyId: string): Promise<LivestockMovementRecord | null>;
  create(data: CreateLivestockMovementData): Promise<LivestockMovementRecord>;
}

export interface LivestockReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
  findByIdForCompany(id: string, companyId: string): Promise<{ id: string } | null>;
}

export interface LotReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
  findByIdForCompany(id: string, companyId: string): Promise<{ id: string } | null>;
}
