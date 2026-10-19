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

  /// Reuses an existing row when the type differs only in case or spacing, so a
  /// dropdown selection never creates a near-duplicate threshold.
  async upsert(
    companyId: string,
    machineType: string,
    limits: ThresholdLimits,
  ): Promise<Threshold> {
    const matching = await this.prisma.maintenanceThreshold.findMany({
      where: {
        companyId,
        machineType: { equals: machineType.trim(), mode: 'insensitive' },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (matching.length > 0) {
      const [keep, ...duplicates] = matching;
      if (duplicates.length > 0) {
        // Legacy rows saved with different casing collapse into the kept one.
        await this.prisma.maintenanceThreshold.deleteMany({
          where: { id: { in: duplicates.map((row) => row.id) } },
        });
      }
      return this.prisma.maintenanceThreshold.update({
        where: { id: keep.id },
        data: limits,
      });
    }

    return this.prisma.maintenanceThreshold.create({
      data: { companyId, machineType: machineType.trim(), ...limits },
    });
  }

  async delete(companyId: string, machineType: string): Promise<boolean> {
    const result = await this.prisma.maintenanceThreshold.deleteMany({
      where: { companyId, machineType },
    });
    return result.count > 0;
  }
}
