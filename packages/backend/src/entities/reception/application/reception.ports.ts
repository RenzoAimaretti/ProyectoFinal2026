import {
  CreateReceptionData,
  RejectReceptionData,
  ReceptionRecord,
  ValidateReceptionData,
} from './reception.types';

export const RECEPTION_REPOSITORY = Symbol('RECEPTION_REPOSITORY');
export const RECEPTION_VALIDATION = Symbol('RECEPTION_VALIDATION');
export const RECEPTION_CLIENT_READER = Symbol('RECEPTION_CLIENT_READER');
export const RECEPTION_INPUT_READER = Symbol('RECEPTION_INPUT_READER');
export const RECEPTION_CLOCK = Symbol('RECEPTION_CLOCK');

export interface ReceptionRepositoryPort {
  create(data: CreateReceptionData): Promise<ReceptionRecord>;
  findByIdForClient(
    id: string,
    clientId: string,
  ): Promise<ReceptionRecord | null>;
  findAllByClient(clientId: string): Promise<ReceptionRecord[]>;
}

/**
 * Capability: decide a pending reception. Approving enters the stock of the
 * declared items and rejecting never touches stock; both must be atomic with
 * the status change.
 */
export interface ReceptionValidationPort {
  validateWithStock(data: ValidateReceptionData): Promise<ReceptionRecord>;
  reject(data: RejectReceptionData): Promise<ReceptionRecord>;
}

export interface ReceptionClientRecord {
  id: string;
  tenantId: string;
}

export interface ReceptionClientReaderPort {
  findById(id: string): Promise<ReceptionClientRecord | null>;
}

export interface ReceptionCatalogueInput {
  id: string;
  unit: string;
}

export interface ReceptionInputReaderPort {
  findExistingForTenant(
    inputIds: string[],
    tenantId: string,
  ): Promise<ReceptionCatalogueInput[]>;
}

export interface ClockPort {
  now(): Date;
}
