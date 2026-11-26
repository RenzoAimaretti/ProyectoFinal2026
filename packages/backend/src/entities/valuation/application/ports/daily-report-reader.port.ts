import { Dec } from '../../domain/decimal';

export const DAILY_REPORT_READER = Symbol('VALUATION_DAILY_REPORT_READER');

/** The part of an approved daily report that valuation needs. */
export interface ReportToValuate {
  id: string;
  companyId: string;
  lotId: string;
  laborTypeId: string;
  hectares: Dec;
  hours: Dec;
}

export interface FindApprovedWithoutValuationQuery {
  companyId: string;
  /** Restricts the search to one labor type (tariff-save trigger). */
  laborTypeId?: string;
  limit: number;
}

/** How many approved reports are still unvalued and how many hectares they hold. */
export interface PendingValuationSummary {
  count: number;
  hectares: Dec;
}

export interface DailyReportReaderPort {
  /** An APPROVED report of the company; `null` if missing, other company or not approved. */
  findApprovedById(
    companyId: string,
    reportId: string,
  ): Promise<ReportToValuate | null>;
  /**
   * APPROVED reports without a valuation, oldest first, at most `limit`. Without
   * `laborTypeId` only reports whose labor type has a tariff of the company.
   */
  findApprovedWithoutValuation(
    query: FindApprovedWithoutValuationQuery,
  ): Promise<ReportToValuate[]>;
  /** Count and hectares of every unvalued approved report (no limit). */
  summarizePendingValuation(
    companyId: string,
  ): Promise<PendingValuationSummary>;
}
