import {
  ClientAccessResult,
  ClientProfileRecord,
  ClientRecord,
  CreateClientData,
  CreateClientWithAccessData,
  UpdateClientInput,
  UpdateClientProfileInput,
} from './client.types';

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');
export const CLIENT_USER_READER = Symbol('CLIENT_USER_READER');
export const CLIENT_PASSWORD_HASHER = Symbol('CLIENT_PASSWORD_HASHER');

export interface ClientRepositoryPort {
  findAllByTenantId(tenantId: string): Promise<ClientRecord[]>;
  findByIdForTenant(id: string, tenantId: string): Promise<ClientRecord | null>;
  findByNameAndTenantId(
    name: string,
    tenantId: string,
  ): Promise<ClientRecord | null>;
  findByUserId(userId: string): Promise<ClientRecord | null>;
  create(data: CreateClientData): Promise<ClientRecord>;
  createWithAccess(data: CreateClientWithAccessData): Promise<ClientAccessResult>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  findProfileByUserId(userId: string): Promise<ClientProfileRecord | null>;
  updateProfileForUserId(
    userId: string,
    data: UpdateClientProfileInput,
  ): Promise<ClientProfileRecord>;
  updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateClientInput,
  ): Promise<ClientRecord>;
}

/**
 * Minimal capability used by other hexagons to scope reads to the client that
 * belongs to the authenticated user. It never exposes mutation capabilities.
 */
export interface ClientUserReaderPort {
  findClientIdByUserId(userId: string): Promise<string | null>;
}

export interface ClientPasswordHasherPort {
  hash(value: string): Promise<string>;
}
