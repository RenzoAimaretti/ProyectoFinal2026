import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DailyReportRepositoryPort } from '../../application/daily-report.ports';
import {
  CreateDailyReportData,
  DailyReportRecord,
  RejectDailyReportData,
} from '../../application/daily-report.types';
import { EntityNotFoundError, InvalidStateTransitionError } from '../../domain/errors';
import {
  DAILY_REPORT_INITIAL_STATUS,
  DAILY_REPORT_REJECTED_STATUS,
} from '../../domain/daily-report-status';
import {
  DAILY_REPORT_ITEM_ORDER_BY,
  buildDailyReportInclude,
  toDailyReportRecord,
} from './daily-report.mapper';

@Injectable()
export class PrismaDailyReportRepository implements DailyReportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDailyReportData): Promise<DailyReportRecord> {
    try {
      const report = await this.prisma.dailyReport.create({
        data: {
          id: data.id,
          operatorId: data.operatorId,
          companyId: data.companyId,
          taskId: data.taskId,
          lotId: data.lotId,
          laborTypeId: data.laborTypeId,
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
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        data.id
      ) {
        const existing = await this.findByIdForCompany(
          data.id,
          data.companyId,
        );
        if (existing) return existing;
      }

      throw error;
    }
  }

  async findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<DailyReportRecord | null> {
    const report = await this.prisma.dailyReport.findFirst({
      where: { id, companyId },
      include: buildDailyReportInclude(),
    });

    return report ? toDailyReportRecord(report) : null;
  }

  async findAllByCompany(companyId: string): Promise<DailyReportRecord[]> {
    const reports = await this.prisma.dailyReport.findMany({
      where: { companyId },
      include: buildDailyReportInclude(),
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });

    return reports.map((report) => toDailyReportRecord(report));
  }

  /**
   * Rejection only writes the terminal status and its auditable reason, guarded
   * by the pending state and the company scope. It never touches stock, and the
   * read/write pair runs in one transaction so a concurrent decision cannot be
   * overwritten.
   */
  async reject(data: RejectDailyReportData): Promise<DailyReportRecord> {
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.dailyReport.findFirst({
        where: { id: data.id, companyId: data.companyId },
        include: buildDailyReportInclude(),
      });

      if (!report) {
        throw new EntityNotFoundError(
          `Daily report with id ${data.id} not found`,
        );
      }

      if (report.status !== DAILY_REPORT_INITIAL_STATUS) {
        throw new InvalidStateTransitionError(
          `A daily report in status ${report.status} cannot be rejected`,
        );
      }

      const { count } = await tx.dailyReport.updateMany({
        where: {
          id: data.id,
          companyId: data.companyId,
          status: DAILY_REPORT_INITIAL_STATUS,
        },
        data: {
          status: DAILY_REPORT_REJECTED_STATUS,
          rejectionReason: data.rejectionReason,
        },
      });

      if (count === 0) {
        throw new InvalidStateTransitionError(
          `Daily report with id ${data.id} was already decided`,
        );
      }

      const stored = await tx.dailyReport.findFirstOrThrow({
        where: { id: data.id, companyId: data.companyId },
        include: buildDailyReportInclude(),
      });

      return toDailyReportRecord(stored);
    });
  }
}
