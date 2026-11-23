import { MarketUnavailableError } from '../../../valuation/domain/errors';
import {
  EntityNotFoundError,
  InvalidInputError,
  PendingSuggestionError,
} from '../../domain/errors';
import {
  FakeCategoryReader,
  FakeLotReader,
  FakeValuation,
  FixedClock,
  InMemoryExpenses,
  NOW,
  suggestionRepositoryOf,
} from '../expense.test-fakes';
import { DeleteExpenseUseCase } from './delete-expense.use-case';
import { UpdateExpenseUseCase } from './update-expense.use-case';

function build() {
  const expenses = new InMemoryExpenses();
  const valuation = new FakeValuation();
  const clock = new FixedClock();
  return {
    expenses,
    valuation,
    suggestions: suggestionRepositoryOf(expenses),
    update: new UpdateExpenseUseCase(
      expenses,
      new FakeLotReader(),
      new FakeCategoryReader(),
      valuation,
      clock,
    ),
    remove: new DeleteExpenseUseCase(expenses, clock),
  };
}

const admin = {
  companyId: 'company-1',
  tenantId: 'tenant-1',
  userId: 'admin-1',
};

describe('UpdateExpenseUseCase (ADMIN direct edit, R-FIN-11)', () => {
  it('revalues with the prices of the day when the amount changes and saves updatedBy', async () => {
    const { update, expenses, valuation } = build();
    const seeded = expenses.seed();

    const saved = await update.execute({
      ...admin,
      id: seeded.id,
      body: { amount: '100000' },
    });

    expect(valuation.calls).toEqual([
      { amount: '100000', unit: 'ARS', grain: null },
    ]);
    expect(saved).toMatchObject({
      amount: '100000',
      amountArs: '100000.00',
      valuedAt: NOW,
      updatedBy: 'admin-1',
      createdBy: 'sup-1',
    });
  });

  it('revalues when the unit or the grain change', async () => {
    const { update, expenses, valuation } = build();
    const kg = expenses.seed({
      unit: 'KG_CEREAL',
      grain: 'MAIZ',
      amount: '300.0000',
    });

    await update.execute({ ...admin, id: kg.id, body: { grain: 'SOJA' } });
    const ars = expenses.seed();
    await update.execute({ ...admin, id: ars.id, body: { unit: 'USD' } });

    expect(valuation.calls).toEqual([
      { amount: '300.0000', unit: 'KG_CEREAL', grain: 'SOJA' },
      { amount: '90000.0000', unit: 'USD', grain: null },
    ]);
  });

  it('keeps the original valuation when only category, lot, date or description change', async () => {
    const { update, expenses, valuation } = build();
    const seeded = expenses.seed({
      unit: 'KG_CEREAL',
      grain: 'MAIZ',
      amount: '300.0000',
      amountArs: '58500.0000',
      grainArsPerTon: '195000.0000',
      priceSource: 'cac.bcr.com.ar',
    });

    const saved = await update.execute({
      ...admin,
      id: seeded.id,
      body: {
        categoryId: 'cat-2',
        lotId: 'lot-2',
        date: '2026-11-21',
        description: 'Otro',
      },
    });

    expect(valuation.calls).toHaveLength(0);
    expect(saved).toMatchObject({
      categoryId: 'cat-2',
      lotId: 'lot-2',
      description: 'Otro',
      amount: '300.0000',
      amountArs: '58500.0000',
      grainArsPerTon: '195000.0000',
      priceSource: 'cac.bcr.com.ar',
      valuedAt: seeded.valuedAt,
      updatedBy: 'admin-1',
    });
    expect(saved.date.toISOString()).toBe('2026-11-21T00:00:00.000Z');
  });

  it('answers 409 without valuing when the expense has a pending suggestion', async () => {
    const { update, expenses, valuation, suggestions } = build();
    const seeded = expenses.seed();
    await suggestions.create({
      expenseId: seeded.id,
      companyId: 'company-1',
      kind: 'BAJA',
      proposed: null,
      suggestedBy: 'sup-1',
    });

    await expect(
      update.execute({ ...admin, id: seeded.id, body: { amount: '1' } }),
    ).rejects.toBeInstanceOf(PendingSuggestionError);
    expect(valuation.calls).toHaveLength(0);
    expect(expenses.expenses.get(seeded.id)?.amount).toBe('90000.0000');
  });

  it('answers not found for an expense of another firma or a deleted one', async () => {
    const { update, expenses } = build();
    const foreign = expenses.seed({ companyId: 'company-2' });
    const gone = expenses.seed();
    expenses.deleted.set(gone.id, { at: NOW, by: 'admin-1' });

    await expect(
      update.execute({ ...admin, id: foreign.id, body: { amount: '1' } }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
    await expect(
      update.execute({ ...admin, id: gone.id, body: { amount: '1' } }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it('validates the tenant lot and the active category only when they change', async () => {
    const { update, expenses } = build();
    const seeded = expenses.seed({ categoryId: 'cat-off' });

    await expect(
      update.execute({
        ...admin,
        id: seeded.id,
        body: { lotId: 'lot-foreign' },
      }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
    await expect(
      update.execute({
        ...admin,
        id: seeded.id,
        body: { categoryId: 'cat-off' },
      }),
    ).resolves.toBeDefined();
    await expect(
      update.execute({
        ...admin,
        id: seeded.id,
        body: { description: 'sin tocar la categoría' },
      }),
    ).resolves.toMatchObject({ categoryId: 'cat-off' });
    await expect(
      update.execute({
        ...admin,
        id: seeded.id,
        body: { categoryId: 'cat-other' },
      }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it('rejects an empty or invalid edit with InvalidInputError', async () => {
    const { update, expenses } = build();
    const seeded = expenses.seed();

    await expect(
      update.execute({ ...admin, id: seeded.id, body: {} }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      update.execute({ ...admin, id: seeded.id, body: { unit: 'KG_CEREAL' } }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it('propagates the market error and leaves the expense unchanged', async () => {
    const { update, expenses, valuation } = build();
    const seeded = expenses.seed();
    valuation.unavailable = true;

    await expect(
      update.execute({ ...admin, id: seeded.id, body: { unit: 'USD' } }),
    ).rejects.toBeInstanceOf(MarketUnavailableError);
    expect(expenses.expenses.get(seeded.id)?.unit).toBe('ARS');
  });
});

describe('DeleteExpenseUseCase (soft delete)', () => {
  it('marks the expense deleted with who and when, and it leaves the listings', async () => {
    const { remove, expenses } = build();
    const seeded = expenses.seed();

    await remove.execute({ ...admin, id: seeded.id });

    expect(expenses.deleted.get(seeded.id)).toEqual({ at: NOW, by: 'admin-1' });
    await expect(expenses.findAll('company-1', {})).resolves.toEqual([]);
    expect(expenses.expenses.has(seeded.id)).toBe(true);
  });

  it('answers 409 when there is a pending suggestion and the expense stays', async () => {
    const { remove, expenses, suggestions } = build();
    const seeded = expenses.seed();
    await suggestions.create({
      expenseId: seeded.id,
      companyId: 'company-1',
      kind: 'BAJA',
      proposed: null,
      suggestedBy: 'sup-1',
    });

    await expect(
      remove.execute({ ...admin, id: seeded.id }),
    ).rejects.toBeInstanceOf(PendingSuggestionError);
    expect(expenses.deleted.size).toBe(0);
  });

  it('answers not found for an expense of another firma', async () => {
    const { remove, expenses } = build();
    const foreign = expenses.seed({ companyId: 'company-2' });

    await expect(
      remove.execute({ ...admin, id: foreign.id }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });
});
