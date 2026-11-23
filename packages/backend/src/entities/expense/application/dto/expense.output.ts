import { Grain, MoneyUnit } from '../../../valuation/domain/money';
import { UsdRateType } from '../../../valuation/domain/valuation-rate-policy';
import { ExpenseSuggestionStatusValue } from '../../domain/expense.rules';

export type SuggestionKind = 'EDICION' | 'BAJA';

/** Resultado de valuar un monto a ARS con la politica unica, mas lo que se uso. */
export interface ExpenseValuation {
  amountArs: string;
  grainArsPerTon: string | null;
  usdRate: string | null;
  usdRateType: UsdRateType | null;
  priceSource: string | null;
  priceFetchedAt: Date | null;
  priceStale: boolean;
}

/** Montos como strings decimales (4 decimales): nunca `number` en el cable. */
export interface ExpenseOutput {
  id: string;
  companyId: string;
  lotId: string;
  categoryId: string;
  date: Date;
  description: string;
  amount: string;
  unit: MoneyUnit;
  grain: Grain | null;
  grainArsPerTon: string | null;
  usdRate: string | null;
  usdRateType: UsdRateType | null;
  priceSource: string | null;
  priceFetchedAt: Date | null;
  priceStale: boolean;
  amountArs: string;
  valuedAt: Date;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  /** Id de la sugerencia PENDIENTE del gasto, si la hay (marca en la UI). */
  pendingSuggestionId: string | null;
}

/** Respuesta de `POST /expenses/preview`: nada se persiste. */
export interface ExpensePreviewOutput extends ExpenseValuation {
  amount: string;
  unit: MoneyUnit;
  grain: Grain | null;
  valuedAt: Date;
}

export interface ProposedValuesOutput {
  lotId: string | null;
  categoryId: string | null;
  date: Date | null;
  description: string | null;
  amount: string | null;
  unit: MoneyUnit | null;
  grain: Grain | null;
}

/** Resumen del gasto para que el supervisor reconozca su sugerencia, incluso dada de baja. */
export interface SuggestionExpenseSummary {
  id: string;
  lotId: string;
  categoryId: string;
  date: Date;
  description: string;
  amount: string;
  unit: MoneyUnit;
  grain: Grain | null;
  amountArs: string;
  deleted: boolean;
}

export interface ExpenseSuggestionOutput {
  id: string;
  expenseId: string;
  companyId: string;
  kind: SuggestionKind;
  status: ExpenseSuggestionStatusValue;
  proposed: ProposedValuesOutput;
  suggestedBy: string;
  rejectionReason: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  expense: SuggestionExpenseSummary;
}
