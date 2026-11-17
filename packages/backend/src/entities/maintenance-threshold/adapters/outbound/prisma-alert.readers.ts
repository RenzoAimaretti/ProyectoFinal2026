import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AlertMachineReaderPort,
  AlertUsageReaderPort,
} from '../../application/threshold.ports';

@Injectable()
export class PrismaAlertMachineReader implements AlertMachineReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByCompanyId(companyId: string) {
    const machines = await this.prisma.machine.findMany({
      where: { companyId },
      select: { id: true, companyId: true, type: true, name: true },
      orderBy: { name: 'asc' },
    });
    return machines;
  }
}

@Injectable()
export class PrismaAlertUsageReader implements AlertUsageReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async totalsForCompany(companyId: string) {
    const totals = await this.prisma.machineUsage.groupBy({
      by: ['machineId'],
      where: { machine: { companyId } },
      _sum: { usageHours: true, hectares: true },
    });
    return totals.map((row) => ({
      machineId: row.machineId,
      usageHours: row._sum.usageHours ?? 0,
      hectares: row._sum.hectares ?? 0,
    }));
  }
}
