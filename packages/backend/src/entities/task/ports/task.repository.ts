import { TaskStatus } from '../domain/task-status';

// Puerto de tarea (REQ-A-01): define el contrato que el service consume.
// Los métodos relacionales addOperator/removeOperator viven acá (no en update)
// porque el legacy los expresa como connect/disconnect sobre la relación
// TaskOperators (REQ-F2-04) — el adapter los implementa con prisma.task.update.

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

// T-F2-51 (D1): el capability port de task-type se eliminó como archivo — su
// token y tipo viven acá para no tocar el service ni su spec (contract
// unchanged). En runtime el módulo lo provee con useExisting:
// TASK_TYPE_REPOSITORY (exportado por TaskTypeModule, T-F2-50).
export const TASK_TYPE_LOOKUP = Symbol('TASK_TYPE_LOOKUP');

export interface TaskTypeLookupPort {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface TaskOperatorRef {
  id: string;
}

export interface TaskEntity {
  id: string;
  lotId: string;
  taskTypeId: string;
  status: TaskStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  updatedTaskAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
}

export interface TaskWithOperatorsEntity extends TaskEntity {
  operators: TaskOperatorRef[];
}

export interface CreateTaskData {
  lotId: string;
  taskTypeId: string;
  startedAt: Date;
}

export interface UpdateTaskData {
  status?: TaskStatus;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface TaskRepositoryPort {
  findAll(): Promise<TaskEntity[]>;
  findById(id: string): Promise<TaskEntity | null>;
  // findMany({ where: { id: { in: ids } } }) del legacy task-type.service update
  // (T-F2-46: cross-read vía TASK_REPOSITORY exportado)
  findByIds(ids: string[]): Promise<TaskEntity[]>;
  // include:{ operators: { select: { id: true } } } del legacy (addOperario/removeOperario)
  findByIdWithOperators(id: string): Promise<TaskWithOperatorsEntity | null>;
  create(data: CreateTaskData): Promise<TaskEntity>;
  update(id: string, data: UpdateTaskData): Promise<TaskEntity>;
  addOperator(taskId: string, operatorId: string): Promise<void>;
  removeOperator(taskId: string, operatorId: string): Promise<void>;
  delete(id: string): Promise<TaskEntity>;
}
