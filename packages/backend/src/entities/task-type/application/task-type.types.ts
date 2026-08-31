export type TaskTypeRecord = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
};

export type CreateTaskTypeInput = {
  name: string;
  description?: string;
};

export type UpdateTaskTypeInput = {
  name?: string;
  description?: string;
  taskIds?: string[];
};

export type CreateTaskTypeData = {
  companyId: string;
  name: string;
  description?: string;
};

export type UpdateTaskTypeData = {
  name?: string;
  description?: string;
  taskIds?: string[];
};

export type RemoveTaskTypeOutput = {
  message: string;
};

export type TaskLookupRecord = {
  id: string;
};
