import { InputUnit } from '../domain/input-unit';

export type InputRecord = {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  unit: InputUnit;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

export type CreateInputInput = {
  categoryId: string;
  name: string;
  unit: InputUnit;
};

export type CreateInputData = {
  tenantId: string;
  categoryId: string;
  name: string;
  unit: InputUnit;
};

export type UpdateInputInput = {
  categoryId?: string;
  name?: string;
  unit?: InputUnit;
  active?: boolean;
};
