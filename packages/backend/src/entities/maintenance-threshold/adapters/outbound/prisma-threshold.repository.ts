import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ThresholdRepositoryPort,
  ThresholdLimits,
  Threshold,
} from '../../application/threshold.ports';

@Injectable()
export class PrismaThresholdRepository implements ThresholdRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string): Promise<Threshold[]> {
    return this.prisma.maintenanceThreshold.findMany({
      where: { companyId },
      orderBy: { machineType: 'asc' },
    });
  }

  upsert(
    companyId: string,
    machineType: string,
    limits: ThresholdLimits,
  ): Promise<Threshold> {
    return this.prisma.maintenanceThreshold.upsert({
      where: { companyId_machineType: { companyId, machineType } },
      create: { companyId, machineType, ...limits },
      update: limits,
    });
  }

  async delete(companyId: string, machineType: string): Promise<boolean> {
    const result = await this.prisma.maintenanceThreshold.deleteMany({
      where: { companyId, machineType },
    });
    return result.count > 0;
  }
}
