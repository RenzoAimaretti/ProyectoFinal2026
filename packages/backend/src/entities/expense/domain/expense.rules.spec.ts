import { Dec } from '../../valuation/domain/decimal';
import { Money } from '../../valuation/domain/money';
import {
  InvalidInputError,
  PendingSuggestionError,
  SuggestionAlreadyResolvedError,
} from './errors';
import {
  ExpenseValues,
  applyChanges,
  assertNoPendingSuggestion,
  assertPendingSuggestion,
  assertRejectionReason,
  parseExpenseChanges,
  parseExpenseFilters,
  parseMoneyInput,
  parseNewExpense,
  requiresRevaluation,
} from './expense.rules';

const valid = {
  lotId: 'lot-1',
  categoryId: 'cat-1',
  date: '2026-11-20',
  description: ' Flete a Rosario ',
  amount: '90000',
  unit: 'ARS',
};

const money = (
  amount: string,
  unit: Money['unit'],
  grain: Money['grain'] = null,
): Money => ({
  amount: Dec.parse(amount),
  unit,
  grain,
});

const current: ExpenseValues = {
  lotId: 'lot-1',
  categoryId: 'cat-1',
  date: new Date('2026-11-20T00:00:00Z'),
  description: 'Flete',
  money: money('300', 'KG_CEREAL', 'MAIZ'),
};

describe('parseNewExpense', () => {
  it('parses a 90000 ARS expense, trims the description and reads the date as UTC midnight', () => {
    const parsed = parseNewExpense(valid);

    expect(parsed.lotId).toBe('lot-1');
    expect(parsed.categoryId).toBe('cat-1');
    expect(parsed.description).toBe('Flete a Rosario');
    expect(parsed.date.toISOString()).toBe('2026-11-20T00:00:00.000Z');
    expect(parsed.money.unit).toBe('ARS');
    expect(parsed.money.grain).toBeNull();
    expect(parsed.money.amount.toString()).toBe('90000');
  });

  it('parses 300 kg of MAIZ', () => {
    const parsed = parseNewExpense({
      ...valid,
      amount: '300',
      unit: 'KG_CEREAL',
      grain: 'MAIZ',
    });

    expect(parsed.money.unit).toBe('KG_CEREAL');
    expect(parsed.money.grain).toBe('MAIZ');
  });

  it.each([
    ['missing lot', { lotId: undefined }],
    ['blank category', { categoryId: ' ' }],
    ['missing description', { description: '' }],
    ['invalid date', { date: 'mañana' }],
    ['missing date', { date: undefined }],
    ['negative amount', { amount: '-1' }],
    ['non numeric amount', { amount: 'abc' }],
    ['more than 4 decimals', { amount: '1.23456' }],
    ['unknown unit', { unit: 'EUR' }],
    ['kg without grain', { unit: 'KG_CEREAL' }],
    ['grain with ARS', { grain: 'SOJA' }],
    ['unknown grain', { unit: 'KG_CEREAL', grain: 'ARROZ' }],
  ])('rejects %s with InvalidInputError', (_label, patch) => {
    expect(() => parseNewExpense({ ...valid, ...patch })).toThrow(
      InvalidInputError,
    );
  });
});

describe('parseMoneyInput (preview)', () => {
  it('parses only the money fields', () => {
    const parsed = parseMoneyInput({
      amount: '10',
      unit: 'USD',
      lotId: 'ignored',
    });

    expect(parsed.unit).toBe('USD');
    expect(parsed.amount.toString()).toBe('10');
  });

  it('rejects a body that is not an object', () => {
    expect(() => parseMoneyInput(null)).toThrow(InvalidInputError);
  });
});

describe('parseExpenseChanges', () => {
  it('keeps only the supplied fields', () => {
    const changes = parseExpenseChanges({
      categoryId: 'cat-2',
      companyId: 'EVIL',
    });

    expect(changes).toEqual({ categoryId: 'cat-2' });
  });

  it('requires at least one supported field', () => {
    expect(() => parseExpenseChanges({})).toThrow(InvalidInputError);
    expect(() => parseExpenseChanges({ companyId: 'EVIL' })).toThrow(
      InvalidInputError,
    );
    expect(() => parseExpenseChanges(null)).toThrow(InvalidInputError);
  });

  it('validates each supplied field', () => {
    expect(() => parseExpenseChanges({ amount: '-3' })).toThrow(
      InvalidInputError,
    );
    expect(() => parseExpenseChanges({ date: 'x' })).toThrow(InvalidInputError);
    expect(() => parseExpenseChanges({ description: '  ' })).toThrow(
      InvalidInputError,
    );
    expect(() => parseExpenseChanges({ unit: 'EUR' })).toThrow(
      InvalidInputError,
    );
  });
});

describe('applyChanges', () => {
  it('merges the changes over the current values', () => {
    const next = applyChanges(current, parseExpenseChanges({ amount: '500' }));

    expect(next.money).toEqual(money('500', 'KG_CEREAL', 'MAIZ'));
    expect(next.lotId).toBe('lot-1');
  });

  it('drops the grain when the unit moves away from kilos and keeps a consistent Money', () => {
    const next = applyChanges(current, parseExpenseChanges({ unit: 'ARS' }));

    expect(next.money.unit).toBe('ARS');
    expect(next.money.grain).toBeNull();
  });

  it('refuses a move to kilos without a grain or a grain with a non-kilos unit', () => {
    const ars: ExpenseValues = { ...current, money: money('10', 'ARS') };

    expect(() =>
      applyChanges(ars, parseExpenseChanges({ unit: 'KG_CEREAL' })),
    ).toThrow(InvalidInputError);
    expect(() =>
      applyChanges(ars, parseExpenseChanges({ grain: 'SOJA' })),
    ).toThrow(InvalidInputError);
    expect(
      applyChanges(
        ars,
        parseExpenseChanges({ unit: 'KG_CEREAL', grain: 'SOJA' }),
      ).money.grain,
    ).toBe('SOJA');
  });
});

describe('requiresRevaluation (R-FIN-11)', () => {
  const base = money('300', 'KG_CEREAL', 'MAIZ');

  it('is true when the amount, the unit or the grain change', () => {
    expect(requiresRevaluation(base, money('301', 'KG_CEREAL', 'MAIZ'))).toBe(
      true,
    );
    expect(requiresRevaluation(base, money('300', 'ARS'))).toBe(true);
    expect(requiresRevaluation(base, money('300', 'KG_CEREAL', 'SOJA'))).toBe(
      true,
    );
  });

  it('is false when the money is the same, whatever its decimal scale', () => {
    expect(
      requiresRevaluation(base, money('300.0000', 'KG_CEREAL', 'MAIZ')),
    ).toBe(false);
  });
});

describe('suggestion rules', () => {
  it('accepts only a PENDIENTE suggestion as resolvable', () => {
    expect(() => assertPendingSuggestion('PENDIENTE')).not.toThrow();
    expect(() => assertPendingSuggestion('APROBADA')).toThrow(
      SuggestionAlreadyResolvedError,
    );
    expect(() => assertPendingSuggestion('RECHAZADA')).toThrow(
      SuggestionAlreadyResolvedError,
    );
  });

  it('refuses to touch an expense that already has a pending suggestion', () => {
    expect(() => assertNoPendingSuggestion(false)).not.toThrow();
    expect(() => assertNoPendingSuggestion(true)).toThrow(
      PendingSuggestionError,
    );
  });

  it('requires a rejection reason and trims it', () => {
    expect(assertRejectionReason('  monto incorrecto ')).toBe(
      'monto incorrecto',
    );
    expect(() => assertRejectionReason('   ')).toThrow(InvalidInputError);
    expect(() => assertRejectionReason(undefined)).toThrow(InvalidInputError);
  });
});

describe('parseExpenseFilters', () => {
  it('parses lot, category and an inclusive date range', () => {
    const filters = parseExpenseFilters({
      lotId: 'lot-1',
      categoryId: 'cat-1',
      from: '2026-07-01',
      to: '2026-12-31',
      companyId: 'EVIL',
    });

    expect(filters.lotId).toBe('lot-1');
    expect(filters.categoryId).toBe('cat-1');
    expect(filters.from?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(filters.to?.toISOString()).toBe('2026-12-31T00:00:00.000Z');
    expect('companyId' in filters).toBe(false);
  });

  it('rejects an invalid date or an inverted range', () => {
    expect(() => parseExpenseFilters({ from: 'x' })).toThrow(InvalidInputError);
    expect(() =>
      parseExpenseFilters({ from: '2026-12-31', to: '2026-01-01' }),
    ).toThrow(InvalidInputError);
  });
});
