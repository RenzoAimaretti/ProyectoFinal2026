import {
  AddTaskOperatorOutput,
  CreateTaskData,
  RemoveTaskOperatorOutput,
  TaskOperatorRecord,
  TaskOutput,
  TaskReadOutput,
  TaskStatusValue,
  TaskWithOperatorsRecord,
  UpdateTaskData,
  UserRoleValue,
} from './task.types';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');
export const LABOR_TYPE_READER = Symbol('LABOR_TYPE_READER');
export const LOT_READER = Symbol('TASK_LOT_READER');
export const USER_READER = Symbol('TASK_USER_READER');

export interface TaskRepositoryPort {
  findAllByTenantId(tenantId: string): Promise<TaskReadOutput[]>;
  findByIdForTenant(id: string, tenantId: string): Promise<TaskReadOutput | null>;
  findByIdWithOperatorsForTenant(
    id: string,
    tenantId: string,
  ): Promise<TaskWithOperatorsRecord | null>;
  create(data: CreateTaskData): Promise<TaskOutput>;
  updateForTenant(id: string, tenantId: string, data: UpdateTaskData): Promise<TaskOutput>;
  addOperatorForTenant(taskId: string, tenantId: string, operatorId: string): Promise<void>;
  removeOperatorForTenant(
    taskId: string,
    tenantId: string,
    operatorId: string,
  ): Promise<void>;
  deleteForTenant(id: string, tenantId: string): Promise<void>;
}

export interface LaborTypeReaderPort {
  findByIdForTenant(id: string, tenantId: string): Promise<{ id: string } | null>;
}

export interface LotReaderPort {
  findByIdForTenant(id: string, tenantId: string): Promise<{ id: string } | null>;
}

export interface UserReaderPort {
  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<{ id: string; role: UserRoleValue } | null>;
}
