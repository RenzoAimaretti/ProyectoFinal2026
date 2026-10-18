export const MACHINE_STATUS_VALUES = ['ACTIVA', 'MANTENIMIENTO', 'FUERA_SERVICIO'] as const;

export type MachineStatusValue = (typeof MACHINE_STATUS_VALUES)[number];

export type MachineUsageRecord = {
  id: string;
  taskId: string;
  machineId: string;
  initialFuel: number | null;
  finalFuel: number | null;
  usageHours: number | null;
  hectares: number | null;
  observations: string | null;
  createdAt: Date;
};

export type CreateMachineUsageInput = {
  machineId: string;
  taskId: string;
  operatorId: string;
  intialFuel?: number;
  usageHours?: number;
  hectares?: number;
};

export type UpdateMachineUsageInput = {
  initialFuel?: number;
  finalFuel?: number;
  usageHours?: number;
  hectares?: number;
  observations?: string;
};

export type CreateMachineUsageData = {
  machineId: string;
  taskId: string;
  initialFuel?: number;
  usageHours?: number;
  hectares?: number;
};

export type UpdateMachineUsageData = {
  initialFuel?: number;
  finalFuel?: number;
  usageHours?: number;
  hectares?: number;
  observations?: string;
};

export type MachineLookupRecord = {
  id: string;
  status: MachineStatusValue;
};

export type TaskWithOperatorsLookupRecord = {
  id: string;
  operators: { id: string }[];
};
