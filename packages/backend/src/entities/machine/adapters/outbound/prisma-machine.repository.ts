import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateMachineData, MachineRecord, UpdateMachineData } from '../../application/machine.types';
import { MachineRepositoryPort } from '../../application/machine.ports';

@Injectable()
export class PrismaMachineRepository implements MachineRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<MachineRecord[]> {
    return this.prisma.machine.findMany();
  }

  findById(id: string): Promise<MachineRecord | null> {
    return this.prisma.machine.findUnique({ where: { id } });
  }

  create(data: CreateMachineData): Promise<MachineRecord> {
    return this.prisma.machine.create({ data });
  }

  update(id: string, data: UpdateMachineData): Promise<MachineRecord> {
    return this.prisma.machine.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.brand !== undefined ? { brand: data.brand } : {}),
        ...(data.entryDate !== undefined ? { entryDate: data.entryDate } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.maintenanceDate !== undefined ? { maintenanceDate: data.maintenanceDate } : {}),
      },
    });
  }
}
