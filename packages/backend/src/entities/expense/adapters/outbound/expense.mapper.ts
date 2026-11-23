import type {
  Expense,
  ExpenseSuggestion,
} from '../../../../../prisma/generated/client';
import {
  ExpenseOutput,
  ExpenseSuggestionOutput,
  SuggestionExpenseSummary,
} from '../../application/dto/expense.output';
import { ExpenseRevaluation } from '../../application/ports/expense-repository.port';

/** Escala de las columnas Decimal(18,4): el cable lleva siempre 4 decimales. */
const WIRE_DECIMALS = 4;

type Decimalish = { toFixed(decimals: number): string };

export function wire(value: Decimalish): string {
  return value.toFixed(WIRE_DECIMALS);
}

function wireOrNull(value: Decimalish | null): string | null {
  return value === null ? null : wire(value);
}

/** Lo que el listado necesita para marcar un gasto con sugerencia pendiente. */
export const WITH_PENDING_SUGGESTION = {
  suggestions: {
    where: { status: 'PENDIENTE' },
    select: { id: true },
    take: 1,
  },
} as const;

export type ExpenseRow = Expense & { suggestions: { id: string }[] };
export type SuggestionRow = ExpenseSuggestion & { expense: Expense };

export function toExpenseOutput(row: ExpenseRow): ExpenseOutput {
  return {
    id: row.id,
    companyId: row.companyId,
    lotId: row.lotId,
    categoryId: row.categoryId,
    date: row.date,
    description: row.description,
    amount: wire(row.amount),
    unit: row.unit,
    grain: row.grain,
    grainArsPerTon: wireOrNull(row.grainArsPerTon),
    usdRate: wireOrNull(row.usdRate),
    usdRateType: row.usdRateType,
    priceSource: row.priceSource,
    priceFetchedAt: row.priceFetchedAt,
    priceStale: row.priceStale,
    amountArs: wire(row.amountArs),
    valuedAt: row.valuedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    pendingSuggestionId: row.suggestions[0]?.id ?? null,
  };
}

function toSummary(row: Expense): SuggestionExpenseSummary {
  return {
    id: row.id,
    lotId: row.lotId,
    categoryId: row.categoryId,
    date: row.date,
    description: row.description,
    amount: wire(row.amount),
    unit: row.unit,
    grain: row.grain,
    amountArs: wire(row.amountArs),
    deleted: row.deletedAt !== null,
  };
}

export function toSuggestionOutput(
  row: SuggestionRow,
): ExpenseSuggestionOutput {
  return {
    id: row.id,
    expenseId: row.expenseId,
    companyId: row.companyId,
    kind: row.kind,
    status: row.status,
    proposed: {
      lotId: row.proposedLotId,
      categoryId: row.proposedCategoryId,
      date: row.proposedDate,
      description: row.proposedDescription,
      amount: wireOrNull(row.proposedAmount),
      unit: row.proposedUnit,
      grain: row.proposedGrain,
    },
    suggestedBy: row.suggestedBy,
    rejectionReason: row.rejectionReason,
    resolvedBy: row.resolvedBy,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
    expense: toSummary(row.expense),
  };
}

/** Columnas de monto y valorizacion que una revalorizacion reescribe. */
export function revaluationData(revaluation: ExpenseRevaluation) {
  const { money, valuation, valuedAt } = revaluation;
  return {
    amount: money.amount.toString(),
    unit: money.unit,
    grain: money.grain,
    grainArsPerTon: valuation.grainArsPerTon,
    usdRate: valuation.usdRate,
    usdRateType: valuation.usdRateType,
    priceSource: valuation.priceSource,
    priceFetchedAt: valuation.priceFetchedAt,
    priceStale: valuation.priceStale,
    amountArs: valuation.amountArs,
    valuedAt,
  };
}
