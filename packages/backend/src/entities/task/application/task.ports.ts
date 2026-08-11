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
  findAll(): Promise<TaskOutput[]>;
  findById(id: string): Promise<TaskOutput | null>;
  findByIdWithOperators(id: string): Promise<TaskWithOperatorsRecord | null>;
  create(data: CreateTaskData): Promise<TaskOutput>;
  update(id: string, data: UpdateTaskData): Promise<TaskOutput>;
  addOperator(taskId: string, operatorId: string): Promise<void>;
  removeOperator(taskId: string, operatorId: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TaskTypeReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface LotReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface UserReaderPort {
  findById(id: string): Promise<{ id: string; role: UserRoleValue } | null>;
}
