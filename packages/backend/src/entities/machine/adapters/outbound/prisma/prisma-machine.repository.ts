import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { MachineStatus as PrismaMachineStatus } from '../../../../../../prisma/generated/enums';
import {
  CreateMachineData,
  MachineEntity,
  MachineRepositoryPort,
  UpdateMachineData,
} from '../../../ports/machine.repository';
import { MachineStatus } from '../../../domain/machine-status';

// Único lugar del módulo que mapea el enum generado ↔ el de dominio (REQ-A-04).
const PRISMA_MACHINE_STATUS_TO_DOMAIN: Record<
  PrismaMachineStatus,
  MachineStatus
> = {
  ACTIVA: MachineStatus.ACTIVA,
  MANTENIMIENTO: MachineStatus.MANTENIMIENTO,
  FUERA_SERVICIO: MachineStatus.FUERA_SERVICIO,
};

const DOMAIN_MACHINE_STATUS_TO_PRISMA: Record<
  MachineStatus,
  PrismaMachineStatus
> = {
  [MachineStatus.ACTIVA]: 'ACTIVA',
  [MachineStatus.MANTENIMIENTO]: 'MANTENIMIENTO',
  [MachineStatus.FUERA_SERVICIO]: 'FUERA_SERVICIO',
};

interface MachineRow {
  id: string;
  companyId: string;
  name: string;
  brand: string | null;
  status: PrismaMachineStatus;
  entryDate: Date | null;
  maintenanceDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
}

@Injectable()
export class PrismaMachineRepository implements MachineRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MachineEntity[]> {
    const rows = await this.prisma.machine.findMany();
    return rows.map((row) => this.toEntity(row));
  }

  async findById(id: string): Promise<MachineEntity | null> {
    const row = await this.prisma.machine.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async create(data: CreateMachineData): Promise<MachineEntity> {
    const row = await this.prisma.machine.create({ data });
    return this.toEntity(row);
  }

  async update(id: string, data: UpdateMachineData): Promise<MachineEntity> {
    const updateData = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.brand !== undefined && { brand: data.brand }),
      ...(data.entryDate !== undefined && { entryDate: data.entryDate }),
      ...(data.status !== undefined && {
        status: DOMAIN_MACHINE_STATUS_TO_PRISMA[data.status],
      }),
      ...(data.maintenanceDate !== undefined && {
        maintenanceDate: data.maintenanceDate,
      }),
    };
    const row = await this.prisma.machine.update({
      where: { id },
      data: updateData,
    });
    return this.toEntity(row);
  }

  private toEntity(row: MachineRow): MachineEntity {
    return {
      ...row,
      status: PRISMA_MACHINE_STATUS_TO_DOMAIN[row.status],
    };
  }
}
