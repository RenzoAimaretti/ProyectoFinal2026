import { MachineStatus } from '../domain/machine-status';

// Puerto de máquina (REQ-A-01): define el contrato que el service consume.
// Espeja las llamadas prisma del legacy machine.service.ts (findMany, findUnique,
// create, update). Sin delete: el legacy no borra máquinas (baja lógica, comentario
// del controller) — REQ-F2-04.

export const MACHINE_REPOSITORY = Symbol('MACHINE_REPOSITORY');

export interface MachineEntity {
  id: string;
  companyId: string;
  name: string;
  brand: string | null;
  status: MachineStatus;
  entryDate: Date | null;
  maintenanceDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
}

export interface CreateMachineData {
  companyId: string;
  name: string;
  brand: string;
  entryDate: string;
}

export interface UpdateMachineData {
  name?: string;
  brand?: string;
  entryDate?: string;
  status?: MachineStatus;
  maintenanceDate?: string;
}

export interface MachineRepositoryPort {
  findAll(): Promise<MachineEntity[]>;
  findById(id: string): Promise<MachineEntity | null>;
  create(data: CreateMachineData): Promise<MachineEntity>;
  update(id: string, data: UpdateMachineData): Promise<MachineEntity>;
}
