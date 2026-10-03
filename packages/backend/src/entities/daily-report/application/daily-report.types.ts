import { DailyReportStatus } from '../domain/daily-report-status';

export type DailyReportItemRecord = {
  id: string;
  dailyReportId: string;
  inputId: string;
  quantity: number;
  unit: string;
  /**
   * Resolved display name of the consumed input. Optional and additive: reads
   * that do not join the catalogue simply omit it, so existing consumers keep
   * working unchanged.
   */
  inputName?: string;
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
  /**
   * Additive display names resolved by the outbound read adapters. They are
   * optional on purpose: every existing read path and consumer keeps compiling
   * and behaving the same when a name cannot be resolved.
   */
  companyName?: string;
  operatorName?: string;
  taskTypeName?: string;
  lotName?: string;
  farmName?: string;
  clientName?: string;
  approvedByName?: string;
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

/**
 * Rejecting never touches stock: it only records the terminal decision and the
 * auditable reason over a pending report scoped to its company.
 */
export type RejectDailyReportData = {
  id: string;
  companyId: string;
  rejectionReason: string;
};
