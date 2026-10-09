import { InputUnit } from '../domain/input-unit';

export type InputRecord = {
  id: string;
  tenantId: string;
  name: string;
  unit: InputUnit;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

export type CreateInputInput = {
  name: string;
  unit: InputUnit;
};

export type CreateInputData = {
  tenantId: string;
  name: string;
  unit: InputUnit;
};

export type UpdateInputInput = {
  name?: string;
  unit?: InputUnit;
  active?: boolean;
};
