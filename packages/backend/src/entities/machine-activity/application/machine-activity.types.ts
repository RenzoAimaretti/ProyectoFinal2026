import { MachineActivityType } from '../domain/machine-activity-type';

export type MachineActivityRecord = {
  id: string;
  machineId: string;
  companyId: string;
  type: MachineActivityType;
  date: Date;
  liters: number | null;
  receipt: string | null;
  cost: number | null;
  spareParts: string | null;
  usageHours: number | null;
  hectares: number | null;
  observations: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * The company is not part of the input: it is the scope the use case receives
 * from the caller and the firma that bears the cost.
 */
export type RegisterMachineActivityInput = {
  machineId: string;
  type: MachineActivityType | string;
  date: string;
  liters?: number | null;
  receipt?: string | null;
  cost?: number | null;
  spareParts?: string | null;
  usageHours?: number | null;
  hectares?: number | null;
  observations?: string | null;
};

export type RegisterMachineActivityData = {
  machineId: string;
  companyId: string;
  type: MachineActivityType;
  date: Date;
  liters: number | null;
  receipt: string | null;
  cost: number | null;
  spareParts: string | null;
  usageHours: number | null;
  hectares: number | null;
  observations: string | null;
};
