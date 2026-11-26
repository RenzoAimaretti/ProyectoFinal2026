import { Grain, MoneyUnit } from '../../../valuation/domain/money';

export const MONEY_VALUATION = Symbol('MONEY_VALUATION');

export interface MoneyToValue {
  amount: string;
  unit: MoneyUnit;
  grain: Grain | null;
}

export interface ArsValuation {
  amountArs: string;
  /** ARS por tonelada usado; solo si el monto era kilos de cereal. */
  grainArsPerTon: string | null;
}

export interface MoneyValuationPort {
  /** Valua con la politica unica; `null` si falta el dato de mercado requerido. */
  valueToArs(money: MoneyToValue): Promise<ArsValuation | null>;
}
