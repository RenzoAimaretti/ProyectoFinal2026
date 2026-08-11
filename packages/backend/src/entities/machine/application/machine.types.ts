export const MACHINE_STATUS_VALUES = ['ACTIVA', 'MANTENIMIENTO', 'FUERA_SERVICIO'] as const;

export type MachineStatusValue = (typeof MACHINE_STATUS_VALUES)[number];

export type MachineRecord = {
  id: string;
  companyId: string;
  name: string;
  brand: string | null;
  status: MachineStatusValue;
  entryDate: Date | null;
  maintenanceDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
};

export type CreateMachineInput = {
  companyId: string;
  name: string;
  brand: string;
  entryDate: string;
};

export type UpdateMachineInput = {
  name?: string;
  brand?: string;
  entryDate?: string;
  status?: MachineStatusValue;
  maintenanceDate?: string;
};

export type CreateMachineData = {
  companyId: string;
  name: string;
  brand: string;
  entryDate: Date;
};

export type UpdateMachineData = {
  name?: string;
  brand?: string;
  entryDate?: Date;
  status?: MachineStatusValue;
  maintenanceDate?: Date;
};
