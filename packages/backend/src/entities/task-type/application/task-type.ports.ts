import {
  CreateTaskTypeData,
  TaskLookupRecord,
  TaskTypeRecord,
  UpdateTaskTypeData,
} from './task-type.types';

export const TASK_TYPE_REPOSITORY = Symbol('TASK_TYPE_REPOSITORY');
export const TASK_READER = Symbol('TASK_TYPE_TASK_READER');

export interface TaskTypeRepositoryPort {
  findAll(): Promise<TaskTypeRecord[]>;
  findById(id: string): Promise<TaskTypeRecord | null>;
  findByName(name: string): Promise<TaskTypeRecord | null>;
  findByIds(ids: string[]): Promise<TaskLookupRecord[]>;
  create(data: CreateTaskTypeData): Promise<TaskTypeRecord>;
  update(id: string, data: UpdateTaskTypeData): Promise<TaskTypeRecord>;
  delete(id: string): Promise<void>;
}

export interface TaskReaderPort {
  findByIds(ids: string[]): Promise<TaskLookupRecord[]>;
}
