import { Grain, MoneyUnit } from '../../../valuation/domain/money';
import { ExpenseValuation } from '../dto/expense.output';

export const MONEY_VALUATION = Symbol('EXPENSE_MONEY_VALUATION');

export interface MoneyToValue {
  amount: string;
  unit: MoneyUnit;
  grain: Grain | null;
}

export interface MoneyValuationPort {
  /**
   * Valua con la politica unica. Si falta el precio o la cotizacion lanza
   * `MarketUnavailableError` (D25: el gasto se rechaza con 503, sin reintento).
   */
  valueToArs(money: MoneyToValue): Promise<ExpenseValuation>;
}
