export type InputRecord = {
  id: string;
  tenantId: string;
  name: string;
  unit: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

export type CreateInputInput = {
  name: string;
  unit: string;
};

export type CreateInputData = {
  tenantId: string;
  name: string;
  unit: string;
};

export type UpdateInputInput = {
  name?: string;
  unit?: string;
  active?: boolean;
};
