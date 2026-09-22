import {
  CreateTaskTypeData,
  TaskLookupRecord,
  TaskTypeRecord,
  UpdateTaskTypeData,
} from './task-type.types';

export const TASK_TYPE_REPOSITORY = Symbol('TASK_TYPE_REPOSITORY');
export const TASK_READER = Symbol('TASK_TYPE_TASK_READER');

export interface TaskTypeRepositoryPort {
  findAllByTenantId(tenantId: string): Promise<TaskTypeRecord[]>;
  findByIdForTenant(id: string, tenantId: string): Promise<TaskTypeRecord | null>;
  findByNameAndTenantId(name: string, tenantId: string): Promise<TaskTypeRecord | null>;
  findByIdsForTenant(ids: string[], tenantId: string): Promise<TaskLookupRecord[]>;
  create(data: CreateTaskTypeData): Promise<TaskTypeRecord>;
  updateForTenant(id: string, tenantId: string, data: UpdateTaskTypeData): Promise<TaskTypeRecord>;
  deleteForTenant(id: string, tenantId: string): Promise<void>;
}

export interface TaskReaderPort {
  findByIdsForTenant(ids: string[], tenantId: string): Promise<TaskLookupRecord[]>;
}
