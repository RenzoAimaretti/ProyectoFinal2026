import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ActivityTotal, MachineReportRepositoryPort, UsageTotal } from '../../application/machine-report.ports';

@Injectable()
export class PrismaMachineReportRepository implements MachineReportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async memberships(userId: string, tenantId: string) {
    const memberships = await this.prisma.userCompany.findMany({
      where: { userId, active: true, user: { tenantId, active: true, deleted: false }, company: { tenantId, deleted: false } },
      select: { company: { select: { id: true, name: true } } },
      orderBy: { company: { name: 'asc' } },
    });
    return memberships.map(({ company }) => company);
  }

  async activityTotals(tenantId: string, companyIds: string[]): Promise<ActivityTotal[]> {
    if (!companyIds.length) return [];
    const groups = await this.prisma.machineActivity.groupBy({
      by: ['companyId', 'type', 'fuelMovement'],
      where: { companyId: { in: companyIds }, company: { tenantId }, machine: { companyId: { in: companyIds }, company: { tenantId } } },
      _sum: { liters: true, cost: true },
    });
    return groups.map((group) => ({ companyId: group.companyId, type: group.type, fuelMovement: group.fuelMovement, liters: group._sum.liters ?? 0, cost: group._sum.cost ?? 0 }));
  }

  async usageTotals(tenantId: string, companyIds: string[]): Promise<UsageTotal[]> {
    if (!companyIds.length) return [];
    const machines = await this.prisma.machine.findMany({
      where: { companyId: { in: companyIds }, company: { tenantId } },
      select: { id: true, companyId: true },
    });
    if (!machines.length) return [];
    const companyByMachine = new Map(machines.map((machine) => [machine.id, machine.companyId]));
    const groups = await this.prisma.machineUsage.groupBy({
      by: ['machineId'],
      where: { machineId: { in: machines.map((machine) => machine.id) }, machine: { companyId: { in: companyIds }, company: { tenantId } } },
      _sum: { usageHours: true, hectares: true },
    });
    return groups.flatMap((group) => {
      const companyId = companyByMachine.get(group.machineId);
      return companyId ? [{ companyId, usageHours: group._sum.usageHours ?? 0, hectares: group._sum.hectares ?? 0 }] : [];
    });
  }
}
