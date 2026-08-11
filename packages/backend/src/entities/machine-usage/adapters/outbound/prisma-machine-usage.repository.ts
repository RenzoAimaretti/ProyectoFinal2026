import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreateMachineUsageData,
  MachineUsageRecord,
  UpdateMachineUsageData,
} from '../../application/machine-usage.types';
import { MachineUsageRepositoryPort } from '../../application/machine-usage.ports';

@Injectable()
export class PrismaMachineUsageRepository implements MachineUsageRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<MachineUsageRecord[]> {
    return this.prisma.machineUsage.findMany();
  }

  findById(id: string): Promise<MachineUsageRecord | null> {
    return this.prisma.machineUsage.findUnique({ where: { id } });
  }

  create(data: CreateMachineUsageData): Promise<MachineUsageRecord> {
    return this.prisma.machineUsage.create({ data });
  }

  update(id: string, data: UpdateMachineUsageData): Promise<MachineUsageRecord> {
    return this.prisma.machineUsage.update({
      where: { id },
      data: {
        ...(data.initialFuel !== undefined ? { initialFuel: data.initialFuel } : {}),
        ...(data.finalFuel !== undefined ? { finalFuel: data.finalFuel } : {}),
        ...(data.usageHours !== undefined ? { usageHours: data.usageHours } : {}),
        ...(data.observations !== undefined ? { observations: data.observations } : {}),
      },
    });
  }
}
