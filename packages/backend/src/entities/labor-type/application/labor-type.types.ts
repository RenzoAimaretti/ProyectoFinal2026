export type LaborTypeRecord = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
};

export type CreateLaborTypeInput = {
  name: string;
  description?: string;
};

export type UpdateLaborTypeInput = {
  name?: string;
  description?: string;
  taskIds?: string[];
};

export type CreateLaborTypeData = {
  tenantId: string;
  name: string;
  description?: string;
};

export type UpdateLaborTypeData = {
  name?: string;
  description?: string;
  taskIds?: string[];
};

export type RemoveLaborTypeOutput = {
  message: string;
};

export type TaskLookupRecord = {
  id: string;
};
