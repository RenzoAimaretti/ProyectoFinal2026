import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  CreateMachineUsageData,
  MachineUsageEntity,
  MachineUsageRepositoryPort,
  UpdateMachineUsageData,
} from '../../../ports/machine-usage.repository';

@Injectable()
export class PrismaMachineUsageRepository implements MachineUsageRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MachineUsageEntity[]> {
    return this.prisma.machineUsage.findMany();
  }

  async findById(id: string): Promise<MachineUsageEntity | null> {
    return this.prisma.machineUsage.findUnique({ where: { id } });
  }

  async create(data: CreateMachineUsageData): Promise<MachineUsageEntity> {
    return this.prisma.machineUsage.create({ data });
  }

  async update(
    id: string,
    data: UpdateMachineUsageData,
  ): Promise<MachineUsageEntity> {
    return this.prisma.machineUsage.update({ where: { id }, data });
  }
}
