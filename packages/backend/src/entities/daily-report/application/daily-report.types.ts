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
  id?: string;
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
  id?: string;
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

/**
 * The company is the report scope and the client is the owner of the stock that
 * gets consumed. The client is never inferred from the company: it comes from
 * the lot farm, because stock is client-scoped and not firm-scoped (R017).
 */
export type ApproveDailyReportData = {
  id: string;
  companyId: string;
  clientId: string;
  approvedBy: string;
  approvedAt: Date;
};
