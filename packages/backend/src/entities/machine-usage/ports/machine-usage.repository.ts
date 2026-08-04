// Puertos del módulo machine-usage (REQ-A-01). Espeja las llamadas prisma del
// legacy machine-usage.service.ts (findMany, findUnique, create, update) y las
// entidades tal como las devuelve Prisma hoy (byte-idéntico). El legacy NO tiene
// delete (no existe método remove en el service ni ruta DELETE en el controller).

export const MACHINE_USAGE_REPOSITORY = Symbol('MACHINE_USAGE_REPOSITORY');

export interface MachineUsageEntity {
  id: string;
  taskId: string;
  machineId: string;
  initialFuel: number | null;
  finalFuel: number | null;
  usageHours: number | null;
  observations: string | null;
  createdAt: Date;
}

// Divergencia consciente (REQ-A-01, precedente T-F2-41): el legacy escribía
// `intialFuel` (typo) pero el schema Prisma tiene `initialFuel` (schema.prisma
// línea 138) — el create legacy SIEMPRE fallaba con P2009 unknown argument.
// El puerto usa el nombre correcto del schema; ver nota en el spec (T-F2-58).
export interface CreateMachineUsageData {
  machineId: string;
  taskId: string;
  initialFuel: number;
}

export interface UpdateMachineUsageData {
  initialFuel?: number;
  finalFuel?: number;
  usageHours?: number;
  observations?: string;
}

export interface MachineUsageRepositoryPort {
  findAll(): Promise<MachineUsageEntity[]>;
  findById(id: string): Promise<MachineUsageEntity | null>;
  create(data: CreateMachineUsageData): Promise<MachineUsageEntity>;
  update(id: string, data: UpdateMachineUsageData): Promise<MachineUsageEntity>;
}
