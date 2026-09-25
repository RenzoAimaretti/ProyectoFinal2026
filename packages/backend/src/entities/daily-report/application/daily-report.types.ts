import { DailyReportStatus } from '../domain/daily-report-status';

export type DailyReportItemRecord = {
  id: string;
  dailyReportId: string;
  inputId: string;
  quantity: number;
  unit: string;
};

export type DailyReportRecord = {
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
  items: DailyReportItemRecord[];
};

export type CreateDailyReportItemInput = {
  inputId: string;
  quantity: number;
  unit?: string;
};

/**
 * The company is not part of the input: it is the scope the use case receives
 * from the caller. `lotId` and `taskTypeId` are inherited from the referenced
 * task instead of being trusted from the client.
 */
export type CreateDailyReportInput = {
  operatorId: string;
  taskId: string;
  date: string;
  hectares: number;
  hours: number;
  items: CreateDailyReportItemInput[];
};

export type CreateDailyReportItemData = {
  inputId: string;
  quantity: number;
  unit: string;
};

export type CreateDailyReportData = {
  operatorId: string;
  companyId: string;
  taskId: string;
  lotId: string;
  taskTypeId: string;
  date: Date;
  hectares: number;
  hours: number;
  status: DailyReportStatus;
  items: CreateDailyReportItemData[];
};
