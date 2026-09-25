import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DailyReportRepositoryPort } from '../../application/daily-report.ports';
import {
  CreateDailyReportData,
  DailyReportItemRecord,
  DailyReportRecord,
} from '../../application/daily-report.types';
import { DailyReportStatus } from '../../domain/daily-report-status';

const DAILY_REPORT_ITEM_ORDER_BY = {
  orderBy: [{ id: 'asc' as const }],
};

type DailyReportItemRow = {
  id: string;
  dailyReportId: string;
  inputId: string;
  quantity: number;
  unit: string;
};

type DailyReportRow = {
  id: string;
  operatorId: string;
  companyId: string;
  taskId: string;
  lotId: string;
  taskTypeId: string;
  date: Date;
  hectares: number;
  hours: number;
  status: DailyReportStatus;
  rejectionReason: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: DailyReportItemRow[];
};

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

    return this.toDailyReportRecord(report);
  }

  async findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<DailyReportRecord | null> {
    const report = await this.prisma.dailyReport.findFirst({
      where: { id, companyId },
      include: { items: DAILY_REPORT_ITEM_ORDER_BY },
    });

    return report ? this.toDailyReportRecord(report) : null;
  }

  async findAllByCompany(companyId: string): Promise<DailyReportRecord[]> {
    const reports = await this.prisma.dailyReport.findMany({
      where: { companyId },
      include: { items: DAILY_REPORT_ITEM_ORDER_BY },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });

    return reports.map((report) => this.toDailyReportRecord(report));
  }

  private toDailyReportRecord(report: DailyReportRow): DailyReportRecord {
    return {
      id: report.id,
      operatorId: report.operatorId,
      companyId: report.companyId,
      taskId: report.taskId,
      lotId: report.lotId,
      taskTypeId: report.taskTypeId,
      date: report.date,
      hectares: report.hectares,
      hours: report.hours,
      status: report.status,
      rejectionReason: report.rejectionReason,
      approvedAt: report.approvedAt,
      approvedBy: report.approvedBy,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      items: report.items.map(
        (item): DailyReportItemRecord => ({
          id: item.id,
          dailyReportId: item.dailyReportId,
          inputId: item.inputId,
          quantity: item.quantity,
          unit: item.unit,
        }),
      ),
    };
  }
}
