export const TASK_STATUS_VALUES = [
  'PENDIENTE',
  'EN_PROGRESO',
  'FINALIZADA',
  'CANCELADA',
] as const;

export type TaskStatusValue = (typeof TASK_STATUS_VALUES)[number];

export const USER_ROLE_VALUES = [
  'ADMIN',
  'OPERARIO',
  'SUPERVISOR',
  'PRODUCTOR',
  'CONTRATISTA',
  'VETERINARIO',
] as const;

export type UserRoleValue = (typeof USER_ROLE_VALUES)[number];

export type TaskRecord = {
  id: string;
  lotId: string;
  laborTypeId: string;
  status: TaskStatusValue;
  startedAt: Date | null;
  finishedAt: Date | null;
  updatedTaskAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

export type TaskOperatorRecord = {
  id: string;
};

export type TaskOperatorSummary = {
  id: string;
  name: string;
};

export type TaskWithOperatorsRecord = TaskRecord & {
  operators: TaskOperatorRecord[];
};

/**
 * Additive read enrichment returned by the list and single-task reads. Every
 * new field is optional so existing consumers keep working unchanged; the
 * mapper resolves `farmName` through `lot -> farm` and the operator display
 * name as `username ?? email`.
 */
export type TaskReadOutput = TaskRecord & {
  lotName?: string;
  farmName?: string;
  laborTypeName?: string;
  operators?: TaskOperatorSummary[];
};

export type CreateTaskInput = {
  lotId: string;
  laborTypeId: string;
  startedAt: string;
};

export type UpdateTaskInput = {
  status?: TaskStatusValue;
  startedAt?: string;
  finishedAt?: string;
};

export type CreateTaskData = {
  lotId: string;
  laborTypeId: string;
  startedAt: Date;
};

export type UpdateTaskData = {
  status?: TaskStatusValue;
  startedAt?: Date;
  finishedAt?: Date;
};

export type TaskOutput = TaskRecord;

export type AddTaskOperatorOutput = {
  message: string;
};

export type RemoveTaskOperatorOutput = {
  message: string;
};
