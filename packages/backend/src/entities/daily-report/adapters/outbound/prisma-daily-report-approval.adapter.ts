import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DailyReportApprovalPort } from '../../application/daily-report.ports';
import {
  ApproveDailyReportData,
  DailyReportRecord,
} from '../../application/daily-report.types';
import {
  EntityNotFoundError,
  InsufficientStockError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import {
  DAILY_REPORT_APPROVED_STATUS,
  DAILY_REPORT_INITIAL_STATUS,
} from '../../domain/daily-report-status';
import {
  DAILY_REPORT_ITEM_ORDER_BY,
  toDailyReportRecord,
} from './daily-report.mapper';

/**
 * The report approval and the stock deduction it causes must succeed or fail
 * together: an approved report without its deduction would leave the inventory
 * wrong, and a deduction without the approval would lose the traceability of
 * the consumption. Prisma cannot span feature repositories inside one
 * transaction, so this adapter owns the transaction and writes both tables with
 * the guarded, client-scoped keys.
 *
 * The stock key is always `{ clientId, inputId }`: the firm of the report never
 * partitions a balance (R017, CUU07).
 */
@Injectable()
export class PrismaDailyReportApprovalAdapter
  implements DailyReportApprovalPort
{
  constructor(private readonly prisma: PrismaService) {}

  async approveWithStockDeduction(
    data: ApproveDailyReportData,
  ): Promise<DailyReportRecord> {
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.dailyReport.findFirst({
        where: { id: data.id, companyId: data.companyId },
        include: { items: DAILY_REPORT_ITEM_ORDER_BY },
      });

      if (!report) {
        throw new EntityNotFoundError(
          `Daily report with id ${data.id} not found`,
        );
      }

      if (report.status !== DAILY_REPORT_INITIAL_STATUS) {
        throw new InvalidStateTransitionError(
          `A daily report in status ${report.status} cannot be approved`,
        );
      }

      for (const item of report.items) {
        const stock = await tx.stock.findUnique({
          where: {
            clientId_inputId: {
              clientId: data.clientId,
              inputId: item.inputId,
            },
          },
        });
        const available = stock?.quantity ?? 0;

        if (available < item.quantity) {
          throw new InsufficientStockError(
            data.clientId,
            item.inputId,
            item.quantity,
            available,
          );
        }

        const { count } = await tx.stock.updateMany({
          where: {
            clientId: data.clientId,
            inputId: item.inputId,
            quantity: { gte: item.quantity },
          },
          data: { quantity: { decrement: item.quantity } },
        });

        if (count === 0) {
          throw new InsufficientStockError(
            data.clientId,
            item.inputId,
            item.quantity,
            available,
          );
        }
      }

      const { count } = await tx.dailyReport.updateMany({
        where: {
          id: report.id,
          companyId: data.companyId,
          status: DAILY_REPORT_INITIAL_STATUS,
        },
        data: {
          status: DAILY_REPORT_APPROVED_STATUS,
          approvedBy: data.approvedBy,
          approvedAt: data.approvedAt,
        },
      });

      if (count === 0) {
        throw new InvalidStateTransitionError(
          `Daily report with id ${report.id} was already decided`,
        );
      }

      const stored = await tx.dailyReport.findFirstOrThrow({
        where: { id: report.id, companyId: data.companyId },
        include: { items: DAILY_REPORT_ITEM_ORDER_BY },
      });

      return toDailyReportRecord(stored);
    });
  }
}
