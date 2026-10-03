import {
  CompanyRecord,
  CompanyWithModules,
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanyModuleRecord,
} from './company.types';

export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY');
export const MODULE_READER = Symbol('MODULE_READER');

export interface CompanyRepositoryPort {
  findAllByTenantId(tenantId: string): Promise<CompanyRecord[]>;
  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<CompanyWithModules | null>;
  findByCuit(cuit: string): Promise<CompanyWithModules | null>;
  create(data: CreateCompanyInput): Promise<CompanyRecord>;
  updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateCompanyInput,
  ): Promise<CompanyRecord>;
  addModuleForTenant(
    companyId: string,
    tenantId: string,
    moduleId: string,
  ): Promise<void>;
}

export interface ModuleReaderPort {
  findById(id: string): Promise<CompanyModuleRecord | null>;
}
