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
  'PRODUCTOR',
  'CONTRATISTA',
  'VETERINARIO',
] as const;

export type UserRoleValue = (typeof USER_ROLE_VALUES)[number];

export type TaskRecord = {
  id: string;
  lotId: string;
  taskTypeId: string;
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

export type TaskWithOperatorsRecord = TaskRecord & {
  operators: TaskOperatorRecord[];
};

export type CreateTaskInput = {
  lotId: string;
  taskTypeId: string;
  startedAt: string;
};

export type UpdateTaskInput = {
  status?: TaskStatusValue;
  startedAt?: string;
  finishedAt?: string;
};

export type CreateTaskData = {
  lotId: string;
  taskTypeId: string;
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
