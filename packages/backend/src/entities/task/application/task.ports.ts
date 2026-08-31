import {
  AddTaskOperatorOutput,
  CreateTaskData,
  RemoveTaskOperatorOutput,
  TaskOperatorRecord,
  TaskOutput,
  TaskStatusValue,
  TaskWithOperatorsRecord,
  UpdateTaskData,
  UserRoleValue,
} from './task.types';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');
export const TASK_TYPE_READER = Symbol('TASK_TYPE_READER');
export const LOT_READER = Symbol('TASK_LOT_READER');
export const USER_READER = Symbol('TASK_USER_READER');

export interface TaskRepositoryPort {
  findAllByCompanyId(companyId: string): Promise<TaskOutput[]>;
  findByIdForCompany(id: string, companyId: string): Promise<TaskOutput | null>;
  findByIdWithOperatorsForCompany(
    id: string,
    companyId: string,
  ): Promise<TaskWithOperatorsRecord | null>;
  create(data: CreateTaskData): Promise<TaskOutput>;
  updateForCompany(id: string, companyId: string, data: UpdateTaskData): Promise<TaskOutput>;
  addOperatorForCompany(taskId: string, companyId: string, operatorId: string): Promise<void>;
  removeOperatorForCompany(
    taskId: string,
    companyId: string,
    operatorId: string,
  ): Promise<void>;
  deleteForCompany(id: string, companyId: string): Promise<void>;
}

export interface TaskTypeReaderPort {
  findByIdForCompany(id: string, companyId: string): Promise<{ id: string } | null>;
}

export interface LotReaderPort {
  findByIdForCompany(id: string, companyId: string): Promise<{ id: string } | null>;
}

export interface UserReaderPort {
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<{ id: string; role: UserRoleValue } | null>;
}
