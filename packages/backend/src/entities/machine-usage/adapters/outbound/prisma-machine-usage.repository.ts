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

  findAllByCompanyId(companyId: string): Promise<MachineUsageRecord[]> {
    return this.prisma.machineUsage.findMany({
      where: {
        machine: { companyId },
        task: { lot: { farm: { companyId } } },
      },
    });
  }

  findByIdForCompany(id: string, companyId: string): Promise<MachineUsageRecord | null> {
    return this.prisma.machineUsage.findFirst({
      where: {
        id,
        machine: { companyId },
        task: { lot: { farm: { companyId } } },
      },
    });
  }

  create(data: CreateMachineUsageData): Promise<MachineUsageRecord> {
    return this.prisma.machineUsage.create({ data });
  }

  async updateForCompany(
    id: string,
    companyId: string,
    data: UpdateMachineUsageData,
  ): Promise<MachineUsageRecord> {
    const machineUsage = await this.prisma.machineUsage.findFirst({
      where: {
        id,
        machine: { companyId },
        task: { lot: { farm: { companyId } } },
      },
      select: { id: true },
    });

    if (!machineUsage) {
      throw new Error(`Machine usage with id ${id} not found for company ${companyId}`);
    }

    return this.prisma.machineUsage.update({
      where: { id: machineUsage.id },
      data: {
        ...(data.initialFuel !== undefined ? { initialFuel: data.initialFuel } : {}),
        ...(data.finalFuel !== undefined ? { finalFuel: data.finalFuel } : {}),
        ...(data.usageHours !== undefined ? { usageHours: data.usageHours } : {}),
        ...(data.observations !== undefined ? { observations: data.observations } : {}),
      },
    });
  }
}
