import { Grain, MoneyUnit, TariffBasis } from '../../../valuation/domain/money';
import { UsdRateType } from '../../../valuation/domain/valuation-rate-policy';
import { ValuationMode } from '../../domain/valuation-mode';

/** Amounts travel as decimal strings; ARS with 2 decimals. */
export interface RangeOutput {
  campaign: string | null;
  from: string;
  to: string;
}

export interface ValuationInfoOutput {
  /** Only in `A_VALOR_HOY` and only when a USD amount was re-priced. */
  usdRateType: UsdRateType | null;
  /** Oldest `fetchedAt` of the prices used; only in `A_VALOR_HOY`. */
  priceDate: string | null;
}

export interface PendingOutput {
  reports: number;
  hectares: string;
}

export interface LotMetricsOutput {
  areaHa: string;
  incomeArs: string;
  standardCostArs: string;
  expensesArs: string;
  costArs: string;
  marginArs: string;
  marginPerHaArs: string | null;
  /** `null` when the cost is 0: the UI shows "—". */
  profitability: string | null;
}

export interface LotRowOutput extends LotMetricsOutput {
  lotId: string;
  lotName: string;
  farmName: string;
  clientName: string;
}

export interface TotalsOutput {
  areaHa: string;
  incomeArs: string;
  costArs: string;
  marginArs: string;
  marginPerHaArs: string | null;
  profitability: string | null;
}

export interface LotProfitabilityListOutput {
  mode: ValuationMode;
  range: RangeOutput;
  lots: LotRowOutput[];
  totals: TotalsOutput;
  pending: PendingOutput;
  valuation: ValuationInfoOutput;
}

export interface TariffComponentOutput {
  amount: string;
  unit: MoneyUnit;
  grain: Grain | null;
  basis: TariffBasis;
}

export interface DetailReportOutput {
  reportId: string;
  date: string;
  laborName: string;
  /** Worked quantity of the price basis (hectares or hours). */
  quantity: string;
  hectares: string;
  hours: string;
  price: TariffComponentOutput;
  cost: TariffComponentOutput;
  incomeNative: string;
  incomeArs: string;
  standardCostNative: string;
  standardCostArs: string;
  /** About the valuation at approval time, whatever the mode. */
  priceStale: boolean;
  priceFetchedAt: string | null;
  valuedAt: string;
  lateValuation: boolean;
}

export interface DetailExpenseOutput {
  expenseId: string;
  date: string;
  description: string;
  amount: string;
  unit: MoneyUnit;
  grain: Grain | null;
  amountArs: string;
  /** About the valuation at load time, whatever the mode. */
  priceStale: boolean;
  priceFetchedAt: string | null;
  valuedAt: string;
}

export interface ExpenseCategoryGroupOutput {
  categoryId: string;
  categoryName: string;
  subtotalArs: string;
  expenses: DetailExpenseOutput[];
}

export interface LotProfitabilityDetailOutput {
  mode: ValuationMode;
  range: RangeOutput;
  lot: {
    lotId: string;
    lotName: string;
    farmName: string;
    clientName: string;
    areaHa: string;
  };
  summary: LotMetricsOutput;
  reports: DetailReportOutput[];
  expensesByCategory: ExpenseCategoryGroupOutput[];
  pending: PendingOutput;
  valuation: ValuationInfoOutput;
}
