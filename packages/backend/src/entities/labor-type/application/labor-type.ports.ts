import {
  CreateLaborTypeData,
  TaskLookupRecord,
  LaborTypeRecord,
  UpdateLaborTypeData,
} from './labor-type.types';

export const LABOR_TYPE_REPOSITORY = Symbol('LABOR_TYPE_REPOSITORY');
export const TASK_READER = Symbol('LABOR_TYPE_TASK_READER');

export interface LaborTypeRepositoryPort {
  findAllByTenantId(tenantId: string): Promise<LaborTypeRecord[]>;
  findByIdForTenant(id: string, tenantId: string): Promise<LaborTypeRecord | null>;
  findByNameAndTenantId(name: string, tenantId: string): Promise<LaborTypeRecord | null>;
  findByIdsForTenant(ids: string[], tenantId: string): Promise<TaskLookupRecord[]>;
  create(data: CreateLaborTypeData): Promise<LaborTypeRecord>;
  updateForTenant(id: string, tenantId: string, data: UpdateLaborTypeData): Promise<LaborTypeRecord>;
  deleteForTenant(id: string, tenantId: string): Promise<void>;
}

export interface TaskReaderPort {
  findByIdsForTenant(ids: string[], tenantId: string): Promise<TaskLookupRecord[]>;
}
