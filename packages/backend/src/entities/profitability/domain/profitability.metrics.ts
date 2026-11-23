import { Dec } from '../../valuation/domain/decimal';

const ARS_DECIMALS = 2;
const RATIO_DECIMALS = 4;
const AREA_DECIMALS = 4;

export interface MetricsInput {
  /** ARS, already rounded to cents. */
  income: Dec;
  /** Standard cost plus manual expenses, ARS. */
  cost: Dec;
  /** `Lot.area` (the lot surface, not the worked hectares). */
  areaHa: Dec;
}

export interface Metrics {
  margin: Dec;
  /** `null` when the area is 0 or negative. */
  marginPerHa: Dec | null;
  /** `null` when the total cost is 0 (the UI shows "—"). */
  profitability: Dec | null;
}

export interface Totals extends Metrics {
  income: Dec;
  cost: Dec;
  areaHa: Dec;
}

export function margin(income: Dec, cost: Dec): Dec {
  return income.sub(cost).roundHalfUp(ARS_DECIMALS);
}

export function marginPerHa(marginArs: Dec, areaHa: Dec): Dec | null {
  if (areaHa.isZero() || areaHa.isNegative()) return null;
  return marginArs.div(areaHa, ARS_DECIMALS);
}

/** margin / cost; undefined for a zero cost, so it is `null`, never 0 or infinity. */
export function profitability(marginArs: Dec, cost: Dec): Dec | null {
  if (cost.isZero()) return null;
  return marginArs.div(cost, RATIO_DECIMALS);
}

export function metricsOf(input: MetricsInput): Metrics {
  const marginArs = margin(input.income, input.cost);
  return {
    margin: marginArs,
    marginPerHa: marginPerHa(marginArs, input.areaHa),
    profitability: profitability(marginArs, input.cost),
  };
}

/** Totals row: the sums first, then the metrics over those sums (D20). */
export function totalsOf(rows: MetricsInput[]): Totals {
  const zero = Dec.parse('0');
  const income = rows
    .reduce((sum, row) => sum.add(row.income), zero)
    .roundHalfUp(ARS_DECIMALS);
  const cost = rows
    .reduce((sum, row) => sum.add(row.cost), zero)
    .roundHalfUp(ARS_DECIMALS);
  const areaHa = rows
    .reduce((sum, row) => sum.add(row.areaHa), zero)
    .roundHalfUp(AREA_DECIMALS);

  return { income, cost, areaHa, ...metricsOf({ income, cost, areaHa }) };
}
