import {
  AddCompanyModuleInput,
  CompanyRecord,
  CompanyWithModules,
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanyModuleRecord,
} from './company.types';

export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY');
export const MODULE_READER = Symbol('MODULE_READER');

export interface CompanyRepositoryPort {
  findAll(): Promise<CompanyRecord[]>;
  findById(id: string): Promise<CompanyWithModules | null>;
  findByCuit(cuit: string): Promise<CompanyWithModules | null>;
  create(data: CreateCompanyInput): Promise<CompanyRecord>;
  update(id: string, data: UpdateCompanyInput): Promise<CompanyRecord>;
  addModule(data: AddCompanyModuleInput): Promise<void>;
}

export interface ModuleReaderPort {
  findById(id: string): Promise<CompanyModuleRecord | null>;
}
