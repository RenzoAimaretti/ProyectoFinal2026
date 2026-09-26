import {
  ClientRecord,
  CreateClientData,
  UpdateClientInput,
} from './client.types';

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

export interface ClientRepositoryPort {
  findAllByTenantId(tenantId: string): Promise<ClientRecord[]>;
  findByIdForTenant(id: string, tenantId: string): Promise<ClientRecord | null>;
  findByNameAndTenantId(
    name: string,
    tenantId: string,
  ): Promise<ClientRecord | null>;
  create(data: CreateClientData): Promise<ClientRecord>;
  updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateClientInput,
  ): Promise<ClientRecord>;
}
