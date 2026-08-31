import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateMachineData, MachineRecord, UpdateMachineData } from '../../application/machine.types';
import { MachineRepositoryPort } from '../../application/machine.ports';

@Injectable()
export class PrismaMachineRepository implements MachineRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByCompanyId(companyId: string): Promise<MachineRecord[]> {
    return this.prisma.machine.findMany({
      where: { companyId },
    });
  }

  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<MachineRecord | null> {
    return this.prisma.machine.findFirst({
      where: { id, companyId },
    });
  }

  create(data: CreateMachineData): Promise<MachineRecord> {
    return this.prisma.machine.create({ data });
  }

  async updateForCompany(
    id: string,
    companyId: string,
    data: UpdateMachineData,
  ): Promise<MachineRecord> {
    const machine = await this.prisma.machine.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!machine) {
      throw new Error(`Machine with id ${id} not found for company ${companyId}`);
    }

    return this.prisma.machine.update({
      where: { id: machine.id },
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
