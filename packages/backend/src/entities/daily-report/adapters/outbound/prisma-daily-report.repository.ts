import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DailyReportRepositoryPort } from '../../application/daily-report.ports';
import {
  CreateDailyReportData,
  DailyReportRecord,
} from '../../application/daily-report.types';
import {
  DAILY_REPORT_ITEM_ORDER_BY,
  toDailyReportRecord,
} from './daily-report.mapper';

@Injectable()
export class PrismaDailyReportRepository implements DailyReportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDailyReportData): Promise<DailyReportRecord> {
    const report = await this.prisma.dailyReport.create({
      data: {
        operatorId: data.operatorId,
        companyId: data.companyId,
        taskId: data.taskId,
        lotId: data.lotId,
        taskTypeId: data.taskTypeId,
        date: data.date,
        hectares: data.hectares,
        hours: data.hours,
        status: data.status,
        items: {
          create: data.items.map((item) => ({
            inputId: item.inputId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: { items: DAILY_REPORT_ITEM_ORDER_BY },
    });

    return toDailyReportRecord(report);
  }

  async findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<DailyReportRecord | null> {
    const report = await this.prisma.dailyReport.findFirst({
      where: { id, companyId },
      include: { items: DAILY_REPORT_ITEM_ORDER_BY },
    });

    return report ? toDailyReportRecord(report) : null;
  }

  async findAllByCompany(companyId: string): Promise<DailyReportRecord[]> {
    const reports = await this.prisma.dailyReport.findMany({
      where: { companyId },
      include: { items: DAILY_REPORT_ITEM_ORDER_BY },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });

    return reports.map((report) => toDailyReportRecord(report));
  }
}
