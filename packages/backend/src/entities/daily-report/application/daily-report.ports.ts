import {
  ApproveDailyReportData,
  CreateDailyReportData,
  DailyReportRecord,
} from './daily-report.types';

export const DAILY_REPORT_REPOSITORY = Symbol('DAILY_REPORT_REPOSITORY');
export const DAILY_REPORT_COMPANY_READER = Symbol(
  'DAILY_REPORT_COMPANY_READER',
);
export const DAILY_REPORT_TASK_READER = Symbol('DAILY_REPORT_TASK_READER');
export const DAILY_REPORT_INPUT_READER = Symbol('DAILY_REPORT_INPUT_READER');
export const DAILY_REPORT_CLIENT_READER = Symbol('DAILY_REPORT_CLIENT_READER');
export const DAILY_REPORT_APPROVAL = Symbol('DAILY_REPORT_APPROVAL');
export const DAILY_REPORT_CLOCK = Symbol('DAILY_REPORT_CLOCK');

export interface DailyReportRepositoryPort {
  create(data: CreateDailyReportData): Promise<DailyReportRecord>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<DailyReportRecord | null>;
  findAllByCompany(companyId: string): Promise<DailyReportRecord[]>;
}

/**
 * Capability: approve a pending report and deduct the consumed stock of its
 * client. Both writes must be atomic, so they belong to one transaction.
 */
export interface DailyReportApprovalPort {
  approveWithStockDeduction(
    data: ApproveDailyReportData,
  ): Promise<DailyReportRecord>;
}

export interface DailyReportCompanyRecord {
  id: string;
  tenantId: string;
}

export interface DailyReportCompanyReaderPort {
  findById(id: string): Promise<DailyReportCompanyRecord | null>;
}

export interface DailyReportTaskRecord {
  id: string;
  lotId: string;
  taskTypeId: string;
  tenantId: string;
}

/**
 * The company belongs to the daily report, not to the task. The task is only
 * read to inherit its lot and task type, and to corroborate that the task and
 * the company share the same tenant.
 */
export interface DailyReportTaskReaderPort {
  findByIdWithScope(id: string): Promise<DailyReportTaskRecord | null>;
}

export interface DailyReportInputReaderPort {
  findExistingIdsForTenant(
    inputIds: string[],
    tenantId: string,
  ): Promise<string[]>;
}

/**
 * Stock is attributed to the client that owns the worked lot, never to the firm
 * that reports the work, so approval resolves the client through the lot farm.
 */
export interface DailyReportClientReaderPort {
  findClientIdByLotId(lotId: string): Promise<string | null>;
}

export interface ClockPort {
  now(): Date;
}
