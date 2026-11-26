import { Dec } from '../../../valuation/domain/decimal';
import {
  Grain,
  Money,
  MoneyUnit,
  TariffBasis,
} from '../../../valuation/domain/money';
import { DayRange } from '../../domain/campaign';

export const PROFITABILITY_READER = Symbol('PROFITABILITY_READER');

export const ENTRY_KIND = {
  INCOME: 'INCOME',
  STANDARD_COST: 'STANDARD_COST',
  EXPENSE: 'EXPENSE',
} as const;
export type EntryKind = (typeof ENTRY_KIND)[keyof typeof ENTRY_KIND];

/**
 * One income, standard-cost or expense component of a lot: the agreed native
 * amount plus the ARS it was valued at when approved or loaded.
 */
export interface ProfitEntry {
  lotId: string;
  kind: EntryKind;
  native: Money;
  arsAtApproval: Dec;
}

export interface LotInfo {
  lotId: string;
  lotName: string;
  farmName: string;
  clientName: string;
  /** `Lot.area`, not the worked hectares. */
  areaHa: Dec;
}

export interface PendingByLot {
  lotId: string;
  reports: number;
  hectares: Dec;
}

export interface LotActivity {
  /** Lots of the tenant that appear in `entries` or `pending`. */
  lots: LotInfo[];
  entries: ProfitEntry[];
  pending: PendingByLot[];
}

export interface ActivityQuery {
  /** Always the session company. */
  companyId: string;
  tenantId: string;
  range: DayRange;
}

export interface LotDetailQuery extends ActivityQuery {
  lotId: string;
}

export interface TariffComponent {
  amount: Dec;
  unit: MoneyUnit;
  grain: Grain | null;
  basis: TariffBasis;
}

export interface DetailReport {
  reportId: string;
  /** Argentine calendar day, `YYYY-MM-DD`. */
  date: string;
  laborName: string;
  hectares: Dec;
  hours: Dec;
  price: TariffComponent;
  cost: TariffComponent;
  income: Money;
  incomeAtApproval: Dec;
  standardCost: Money;
  standardCostAtApproval: Dec;
  /** The price came from an out-of-date cache when it was valued. */
  priceStale: boolean;
  priceFetchedAt: Date | null;
  valuedAt: Date;
  /** Valued by a retry after the approval, not when it was approved. */
  lateValuation: boolean;
}

export interface DetailExpense {
  expenseId: string;
  /** Calendar day, `YYYY-MM-DD`. */
  date: string;
  description: string;
  categoryId: string;
  categoryName: string;
  native: Money;
  arsAtApproval: Dec;
  priceStale: boolean;
  priceFetchedAt: Date | null;
  valuedAt: Date;
}

export interface LotDetailData {
  lot: LotInfo;
  reports: DetailReport[];
  expenses: DetailExpense[];
  pending: { reports: number; hectares: Dec };
}

export interface ProfitabilityReaderPort {
  /** Entries and pending reports of the session company in the range. */
  findActivity(query: ActivityQuery): Promise<LotActivity>;
  /**
   * The detail of one lot, limited to the session company. `null` when the lot
   * does not exist in the tenant.
   */
  findLotDetail(query: LotDetailQuery): Promise<LotDetailData | null>;
}
