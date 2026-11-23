import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../prisma/generated/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  DailyReportReaderPort,
  FindApprovedWithoutValuationQuery,
  PendingValuationSummary,
  ReportToValuate,
} from '../../application/ports/daily-report-reader.port';
import { quantityFromNumber } from '../../domain/valuation.rules';

const SELECT = {
  id: true,
  companyId: true,
  lotId: true,
  laborTypeId: true,
  hectares: true,
  hours: true,
} satisfies Prisma.DailyReportSelect;

type ReportRow = Prisma.DailyReportGetPayload<{ select: typeof SELECT }>;

/**
 * Reads daily reports without importing the daily-report module (no cycle):
 * valuation owns this Prisma query, daily-report only calls valuation.
 */
@Injectable()
export class PrismaDailyReportReader implements DailyReportReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async findApprovedById(
    companyId: string,
    reportId: string,
  ): Promise<ReportToValuate | null> {
    const row = await this.prisma.dailyReport.findFirst({
      where: { id: reportId, companyId, status: 'APROBADO' },
      select: SELECT,
    });
    return row ? toReport(row) : null;
  }

  async findApprovedWithoutValuation(
    query: FindApprovedWithoutValuationQuery,
  ): Promise<ReportToValuate[]> {
    const rows = await this.prisma.dailyReport.findMany({
      where: {
        companyId: query.companyId,
        status: 'APROBADO',
        ...(query.laborTypeId !== undefined
          ? { laborTypeId: query.laborTypeId }
          : {}),
        valuation: { is: null },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      take: query.limit,
      select: SELECT,
    });
    return rows.map(toReport);
  }

  async summarizePendingValuation(
    companyId: string,
  ): Promise<PendingValuationSummary> {
    const result = await this.prisma.dailyReport.aggregate({
      where: { companyId, status: 'APROBADO', valuation: { is: null } },
      _count: { _all: true },
      _sum: { hectares: true },
    });
    return {
      count: result._count._all,
      hectares: quantityFromNumber(result._sum.hectares ?? 0),
    };
  }
}

function toReport(row: ReportRow): ReportToValuate {
  return {
    id: row.id,
    companyId: row.companyId,
    lotId: row.lotId,
    laborTypeId: row.laborTypeId,
    // Float columns become exact decimals through their string form.
    hectares: quantityFromNumber(row.hectares),
    hours: quantityFromNumber(row.hours),
  };
}
