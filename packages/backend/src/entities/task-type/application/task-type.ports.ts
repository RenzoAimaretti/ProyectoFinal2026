import {
  CreateTaskTypeData,
  TaskLookupRecord,
  TaskTypeRecord,
  UpdateTaskTypeData,
} from './task-type.types';

export const TASK_TYPE_REPOSITORY = Symbol('TASK_TYPE_REPOSITORY');
export const TASK_READER = Symbol('TASK_TYPE_TASK_READER');

export interface TaskTypeRepositoryPort {
  findAllByCompanyId(companyId: string): Promise<TaskTypeRecord[]>;
  findByIdForCompany(id: string, companyId: string): Promise<TaskTypeRecord | null>;
  findByNameAndCompanyId(name: string, companyId: string): Promise<TaskTypeRecord | null>;
  findByIdsForCompany(ids: string[], companyId: string): Promise<TaskLookupRecord[]>;
  create(data: CreateTaskTypeData): Promise<TaskTypeRecord>;
  updateForCompany(id: string, companyId: string, data: UpdateTaskTypeData): Promise<TaskTypeRecord>;
  deleteForCompany(id: string, companyId: string): Promise<void>;
}

export interface TaskReaderPort {
  findByIdsForCompany(ids: string[], companyId: string): Promise<TaskLookupRecord[]>;
}
