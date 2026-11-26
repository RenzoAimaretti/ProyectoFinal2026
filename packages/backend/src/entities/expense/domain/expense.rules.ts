import { Dec } from '../../valuation/domain/decimal';
import {
  InvalidDecimalError,
  InvalidMoneyError,
} from '../../valuation/domain/errors';
import {
  Money,
  assertValidMoney,
  isGrain,
  isMoneyUnit,
} from '../../valuation/domain/money';
import {
  InvalidInputError,
  PendingSuggestionError,
  SuggestionAlreadyResolvedError,
} from './errors';

export type ExpenseSuggestionStatusValue =
  | 'PENDIENTE'
  | 'APROBADA'
  | 'RECHAZADA';

/** What a manual expense is, without its valuation: the part a user types. */
export interface ExpenseValues {
  lotId: string;
  categoryId: string;
  date: Date;
  description: string;
  money: Money;
}

/** Partial edit of an expense: every field optional, at least one present. */
export interface ExpenseChanges {
  lotId?: string;
  categoryId?: string;
  date?: Date;
  description?: string;
  amount?: Dec;
  unit?: Money['unit'];
  grain?: Money['grain'];
}

export interface ExpenseFilters {
  lotId?: string;
  categoryId?: string;
  from?: Date;
  to?: Date;
}

/** Decimal(18,4): up to 14 integer digits and 4 decimals. */
const MAX_AMOUNT = Dec.parse('99999999999999.9999');
const MAX_DECIMALS = 4;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/;

function asRecord(raw: unknown, label: string): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new InvalidInputError(`${label} es obligatorio`);
  }
  return raw as Record<string, unknown>;
}

function requiredText(raw: unknown, label: string): string {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new InvalidInputError(`${label} es obligatorio`);
  }
  return raw.trim();
}

function parseAmount(raw: unknown): Dec {
  const text =
    typeof raw === 'string'
      ? raw.trim()
      : typeof raw === 'number' && Number.isFinite(raw)
        ? String(raw)
        : null;
  if (text === null || text === '') {
    throw new InvalidInputError('El monto es obligatorio');
  }
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new InvalidInputError('El monto no es un número válido');
  }

  let amount: Dec;
  try {
    amount = Dec.parse(text);
  } catch (error) {
    if (error instanceof InvalidDecimalError) {
      throw new InvalidInputError('El monto no es un número válido');
    }
    throw error;
  }
  if (amount.isNegative()) {
    throw new InvalidInputError('El monto no puede ser negativo');
  }
  if (amount.roundHalfUp(MAX_DECIMALS).cmp(amount) !== 0) {
    throw new InvalidInputError(
      `El monto admite hasta ${MAX_DECIMALS} decimales`,
    );
  }
  if (amount.cmp(MAX_AMOUNT) > 0) {
    throw new InvalidInputError('El monto es demasiado grande');
  }
  return amount;
}

function parseUnit(raw: unknown): Money['unit'] {
  if (!isMoneyUnit(raw)) {
    throw new InvalidInputError('La moneda debe ser ARS, USD o KG_CEREAL');
  }
  return raw;
}

function parseGrain(raw: unknown): NonNullable<Money['grain']> {
  if (!isGrain(raw)) {
    throw new InvalidInputError('El grano no es válido');
  }
  return raw;
}

/** Expense dates are day-granular: stored as UTC midnight of the given day. */
function parseDay(raw: unknown, label: string): Date {
  if (typeof raw !== 'string' || !DATE_PATTERN.test(raw.trim())) {
    throw new InvalidInputError(`${label} no es una fecha válida`);
  }
  const parsed = new Date(raw.trim());
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidInputError(`${label} no es una fecha válida`);
  }
  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  );
}

function assertMoney(money: Money): Money {
  try {
    assertValidMoney(money);
  } catch (error) {
    if (error instanceof InvalidMoneyError) {
      throw new InvalidInputError(error.message);
    }
    throw error;
  }
  return money;
}

/** Validates the money fields of a body (used by the confirmation preview). */
export function parseMoneyInput(raw: unknown): Money {
  const input = asRecord(raw, 'El cuerpo');
  const grain =
    input.grain === undefined || input.grain === null
      ? null
      : parseGrain(input.grain);
  return assertMoney({
    amount: parseAmount(input.amount),
    unit: parseUnit(input.unit),
    grain,
  });
}

/** Validates a complete new expense. The firma is never part of the body. */
export function parseNewExpense(raw: unknown): ExpenseValues {
  const input = asRecord(raw, 'El cuerpo');
  return {
    lotId: requiredText(input.lotId, 'El lote'),
    categoryId: requiredText(input.categoryId, 'La categoría'),
    date: parseDay(input.date, 'La fecha'),
    description: requiredText(input.description, 'La descripción'),
    money: parseMoneyInput(input),
  };
}

/** Validates the supplied fields of a partial edit; unsupported keys are dropped. */
export function parseExpenseChanges(raw: unknown): ExpenseChanges {
  const input = asRecord(raw, 'El cuerpo');
  const changes: ExpenseChanges = {};
  const has = (key: string) => input[key] !== undefined;

  if (has('lotId')) changes.lotId = requiredText(input.lotId, 'El lote');
  if (has('categoryId')) {
    changes.categoryId = requiredText(input.categoryId, 'La categoría');
  }
  if (has('date')) changes.date = parseDay(input.date, 'La fecha');
  if (has('description')) {
    changes.description = requiredText(input.description, 'La descripción');
  }
  if (has('amount')) changes.amount = parseAmount(input.amount);
  if (has('unit')) changes.unit = parseUnit(input.unit);
  if (input.grain !== undefined && input.grain !== null) {
    changes.grain = parseGrain(input.grain);
  }

  if (Object.keys(changes).length === 0) {
    throw new InvalidInputError('Indicá al menos un campo a modificar');
  }
  return changes;
}

/**
 * Applies a partial edit over the current values and validates the resulting
 * Money. Moving away from kilos drops the grain; moving to kilos needs one.
 */
export function applyChanges(
  current: ExpenseValues,
  changes: ExpenseChanges,
): ExpenseValues {
  const unit = changes.unit ?? current.money.unit;
  const grain =
    changes.grain ?? (unit === 'KG_CEREAL' ? current.money.grain : null);

  return {
    lotId: changes.lotId ?? current.lotId,
    categoryId: changes.categoryId ?? current.categoryId,
    date: changes.date ?? current.date,
    description: changes.description ?? current.description,
    money: assertMoney({
      amount: changes.amount ?? current.money.amount,
      unit,
      grain,
    }),
  };
}

/** Only a change of amount, unit or grain justifies asking the market again. */
export function requiresRevaluation(current: Money, next: Money): boolean {
  return (
    current.amount.cmp(next.amount) !== 0 ||
    current.unit !== next.unit ||
    current.grain !== next.grain
  );
}

/**
 * A suggestion is a terminal decision over a pending one, as with the daily
 * report approval (`assertPendingApproval`).
 */
export function assertPendingSuggestion(
  status: ExpenseSuggestionStatusValue,
): void {
  if (status !== 'PENDIENTE') {
    throw new SuggestionAlreadyResolvedError(
      `A suggestion in status ${status} cannot be resolved again`,
    );
  }
}

export function assertNoPendingSuggestion(hasPending: boolean): void {
  if (hasPending) {
    throw new PendingSuggestionError(
      'El gasto tiene una sugerencia pendiente: resolvela primero',
    );
  }
}

/** A rejection without a reason cannot be audited (same rule as the daily report). */
export function assertRejectionReason(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError('reason is required');
  }
  return value.trim();
}

export function parseExpenseFilters(raw: unknown): ExpenseFilters {
  const input =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const filters: ExpenseFilters = {};

  if (typeof input.lotId === 'string' && input.lotId.trim()) {
    filters.lotId = input.lotId.trim();
  }
  if (typeof input.categoryId === 'string' && input.categoryId.trim()) {
    filters.categoryId = input.categoryId.trim();
  }
  if (input.from !== undefined && input.from !== '') {
    filters.from = parseDay(input.from, 'El parámetro from');
  }
  if (input.to !== undefined && input.to !== '') {
    filters.to = parseDay(input.to, 'El parámetro to');
  }
  if (
    filters.from &&
    filters.to &&
    filters.from.getTime() > filters.to.getTime()
  ) {
    throw new InvalidInputError('El rango de fechas es inválido');
  }
  return filters;
}
