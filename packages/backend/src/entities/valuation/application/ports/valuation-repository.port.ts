import {
  ValuationComputation,
  ValuationTariff,
} from '../../domain/valuation.rules';

export const VALUATION_REPOSITORY = Symbol('VALUATION_REPOSITORY');

export type ValuationOrigin = 'APROBACION' | 'REINTENTO';

export interface ValuationRecord {
  dailyReportId: string;
  companyId: string;
  lotId: string;
  origin: ValuationOrigin;
  /** Copy of the tariff applied at valuation time. */
  tariff: ValuationTariff;
  computation: ValuationComputation;
  valuedAt: Date;
}

export type SaveValuationResult = 'CREATED' | 'ALREADY_EXISTS';

export interface ValuationRepositoryPort {
  /**
   * Inserts the snapshot unless the report already has one. A concurrent
   * duplicate is NOT an error: it resolves to `'ALREADY_EXISTS'`.
   */
  saveIfAbsent(record: ValuationRecord): Promise<SaveValuationResult>;
}
