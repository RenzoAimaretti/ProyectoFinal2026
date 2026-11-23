import { Dec } from '../../valuation/domain/decimal';
import { Money } from '../../valuation/domain/money';
import { EntityNotFoundError, InvalidInputError } from '../domain/errors';
import {
  ExpenseChanges,
  ExpenseValues,
  requiresRevaluation,
} from '../domain/expense.rules';
import { ExpenseOutput } from './dto/expense.output';
import { ClockPort } from './ports/clock.port';
import { ExpenseCategoryReaderPort } from './ports/expense-category-reader.port';
import { ExpenseRevaluation } from './ports/expense-repository.port';
import { LotReaderPort } from './ports/lot-reader.port';
import { MoneyValuationPort } from './ports/money-valuation.port';

/** Rebuilds the user-typed values of a stored expense. */
export function valuesOf(expense: ExpenseOutput): ExpenseValues {
  return {
    lotId: expense.lotId,
    categoryId: expense.categoryId,
    date: expense.date,
    description: expense.description,
    money: {
      amount: Dec.parse(expense.amount),
      unit: expense.unit,
      grain: expense.grain,
    },
  };
}

export async function assertLotInTenant(
  lots: LotReaderPort,
  lotId: string,
  tenantId: string,
): Promise<void> {
  // A lot of another tenant is indistinguishable from a missing one (404).
  if (!(await lots.findInTenant(lotId, tenantId))) {
    throw new EntityNotFoundError('Lot not found');
  }
}

export async function assertActiveCategory(
  categories: ExpenseCategoryReaderPort,
  categoryId: string,
  tenantId: string,
): Promise<void> {
  const category = await categories.findInTenant(categoryId, tenantId);
  if (!category) throw new EntityNotFoundError('Expense category not found');
  if (!category.active) {
    throw new InvalidInputError('La categoría está inactiva');
  }
}

/**
 * Checks the lot and the category only when an edit changes them: an expense
 * that already uses a since-deactivated category must stay editable.
 */
export async function assertChangedReferences(
  changes: ExpenseChanges,
  current: ExpenseValues,
  lots: LotReaderPort,
  categories: ExpenseCategoryReaderPort,
  tenantId: string,
): Promise<void> {
  if (changes.lotId !== undefined && changes.lotId !== current.lotId) {
    await assertLotInTenant(lots, changes.lotId, tenantId);
  }
  if (
    changes.categoryId !== undefined &&
    changes.categoryId !== current.categoryId
  ) {
    await assertActiveCategory(categories, changes.categoryId, tenantId);
  }
}

export function amountText(money: Money): string {
  return money.amount.toString();
}

/**
 * Values the new money with the prices of the day, but only when the amount,
 * the unit or the grain changed; otherwise the stored valuation is kept.
 */
export async function revalueIfNeeded(
  current: Money,
  next: Money,
  valuation: MoneyValuationPort,
  clock: ClockPort,
): Promise<ExpenseRevaluation | null> {
  if (!requiresRevaluation(current, next)) return null;

  const valued = await valuation.valueToArs({
    amount: amountText(next),
    unit: next.unit,
    grain: next.grain,
  });
  return { money: next, valuation: valued, valuedAt: clock.now() };
}
