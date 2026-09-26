import {
  DailyReportItemRecord,
  DailyReportRecord,
} from '../../application/daily-report.types';
import { DailyReportStatus } from '../../domain/daily-report-status';

export const DAILY_REPORT_ITEM_ORDER_BY = {
  orderBy: [{ id: 'asc' as const }],
};

export type DailyReportItemRow = {
  id: string;
  dailyReportId: string;
  inputId: string;
  quantity: number;
  unit: string;
};

export type DailyReportRow = {
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

export function toDailyReportRecord(
  report: DailyReportRow,
): DailyReportRecord {
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
