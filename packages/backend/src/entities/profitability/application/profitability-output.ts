import { Dec } from '../../valuation/domain/decimal';
import { Money } from '../../valuation/domain/money';
import { metricsOf } from '../domain/profitability.metrics';
import {
  LotMetricsOutput,
  PendingOutput,
  RangeOutput,
} from './dto/profitability.output';
import { ResolvedRange } from '../domain/campaign';

const ARS_DECIMALS = 2;
const AREA_DECIMALS = 4;
const QUANTITY_DECIMALS = 4;

export const ZERO = Dec.parse('0');

export function arsText(value: Dec): string {
  return value.roundHalfUp(ARS_DECIMALS).toString();
}

export function quantityText(value: Dec): string {
  return value.roundHalfUp(QUANTITY_DECIMALS).toString();
}

export function sum(values: Dec[]): Dec {
  return values.reduce((total, value) => total.add(value), ZERO);
}

export function rangeOutput(range: ResolvedRange): RangeOutput {
  return { campaign: range.campaign, from: range.from, to: range.to };
}

export function pendingOutput(reports: number, hectares: Dec): PendingOutput {
  return { reports, hectares: quantityText(hectares) };
}

export function moneyAmountText(money: Money): string {
  return money.amount.roundHalfUp(QUANTITY_DECIMALS).toString();
}

/** The metrics of one lot from its three ARS components. */
export function metricsOutput(input: {
  areaHa: Dec;
  income: Dec;
  standardCost: Dec;
  expenses: Dec;
}): LotMetricsOutput {
  const income = input.income.roundHalfUp(ARS_DECIMALS);
  const standardCost = input.standardCost.roundHalfUp(ARS_DECIMALS);
  const expenses = input.expenses.roundHalfUp(ARS_DECIMALS);
  const cost = standardCost.add(expenses);
  const metrics = metricsOf({ income, cost, areaHa: input.areaHa });

  return {
    areaHa: input.areaHa.roundHalfUp(AREA_DECIMALS).toString(),
    incomeArs: arsText(income),
    standardCostArs: arsText(standardCost),
    expensesArs: arsText(expenses),
    costArs: arsText(cost),
    marginArs: arsText(metrics.margin),
    marginPerHaArs: metrics.marginPerHa ? arsText(metrics.marginPerHa) : null,
    profitability: metrics.profitability
      ? metrics.profitability.toString()
      : null,
  };
}
