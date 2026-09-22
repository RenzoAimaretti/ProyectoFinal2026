import { CreateFarmInput, FarmRecord, UpdateFarmInput } from './farm.types';

export const FARM_REPOSITORY = Symbol('FARM_REPOSITORY');
export const CLIENT_READER = Symbol('CLIENT_READER');

export interface FarmRepositoryPort {
  findAllByCompanyId(companyId: string): Promise<FarmRecord[]>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<FarmRecord | null>;
  findByNameAndClientId(
    name: string,
    clientId: string,
  ): Promise<FarmRecord | null>;
  create(data: CreateFarmInput & { clientId: string }): Promise<FarmRecord>;
  updateForCompany(
    id: string,
    companyId: string,
    data: UpdateFarmInput,
  ): Promise<FarmRecord>;
}

export interface ClientReaderPort {
  findByIdForTenant(id: string, tenantId: string): Promise<{ id: string } | null>;
}
