import {
  CreateDailyReportData,
  DailyReportRecord,
} from './daily-report.types';

export const DAILY_REPORT_REPOSITORY = Symbol('DAILY_REPORT_REPOSITORY');
export const DAILY_REPORT_COMPANY_READER = Symbol(
  'DAILY_REPORT_COMPANY_READER',
);
export const DAILY_REPORT_TASK_READER = Symbol('DAILY_REPORT_TASK_READER');
export const DAILY_REPORT_INPUT_READER = Symbol('DAILY_REPORT_INPUT_READER');

export interface DailyReportRepositoryPort {
  create(data: CreateDailyReportData): Promise<DailyReportRecord>;
  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<DailyReportRecord | null>;
  findAllByCompany(companyId: string): Promise<DailyReportRecord[]>;
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
