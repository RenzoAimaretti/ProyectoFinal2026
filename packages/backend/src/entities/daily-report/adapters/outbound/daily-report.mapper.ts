import {
  DailyReportItemRecord,
  DailyReportRecord,
} from '../../application/daily-report.types';
import { DailyReportStatus } from '../../domain/daily-report-status';

export const DAILY_REPORT_ITEM_ORDER_BY = {
  orderBy: [{ id: 'asc' as const }],
};

/**
 * Item read that also resolves the input catalogue name. Used by the read and
 * decision paths that return an enriched report; `create` keeps the lean
 * include because it only needs the persisted aggregate.
 */
export const DAILY_REPORT_ITEM_INCLUDE = {
  orderBy: [{ id: 'asc' as const }],
  include: { input: { select: { name: true } } },
};

export type DailyReportUserRow = {
  username: string | null;
  email: string;
};

export type DailyReportItemRow = {
  id: string;
  dailyReportId: string;
  inputId: string;
  quantity: number;
  unit: string;
  input?: { name: string } | null;
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
  company?: { name: string } | null;
  operator?: DailyReportUserRow | null;
  taskType?: { name: string } | null;
  task?: {
    lot?: {
      name: string;
      farm?: {
        name: string;
        client?: { name: string } | null;
      } | null;
    } | null;
  } | null;
  approver?: DailyReportUserRow | null;
};

/**
 * Names that enrich a daily report are resolved from the relations the read
 * adapters join. Every name is optional so a read that does not join a relation
 * simply omits it and never breaks existing consumers.
 */
export function buildDailyReportInclude() {
  return {
    items: DAILY_REPORT_ITEM_INCLUDE,
    company: { select: { name: true } },
    operator: { select: { username: true, email: true } },
    taskType: { select: { name: true } },
    task: {
      select: {
        lot: {
          select: {
            name: true,
            farm: {
              select: {
                name: true,
                client: { select: { name: true } },
              },
            },
          },
        },
      },
    },
    approver: { select: { username: true, email: true } },
  };
}

function displayName(user?: DailyReportUserRow | null): string | undefined {
  if (!user) {
    return undefined;
  }

  return user.username ?? user.email;
}

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
    companyName: report.company?.name,
    operatorName: displayName(report.operator),
    taskTypeName: report.taskType?.name,
    lotName: report.task?.lot?.name,
    farmName: report.task?.lot?.farm?.name,
    clientName: report.task?.lot?.farm?.client?.name,
    approvedByName: displayName(report.approver),
    items: report.items.map(
      (item): DailyReportItemRecord => ({
        id: item.id,
        dailyReportId: item.dailyReportId,
        inputId: item.inputId,
        quantity: item.quantity,
        unit: item.unit,
        inputName: item.input?.name,
      }),
    ),
  };
}
