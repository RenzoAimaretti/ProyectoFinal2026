import {
  EntityNotFoundError,
  InvalidInputError,
  PendingSuggestionError,
  SuggestionAlreadyResolvedError,
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
import { ApproveExpenseSuggestionUseCase } from './approve-expense-suggestion.use-case';
import { CreateExpenseSuggestionUseCase } from './create-expense-suggestion.use-case';
import { FindExpenseSuggestionsUseCase } from './find-expense-suggestions.use-case';
import { RejectExpenseSuggestionUseCase } from './reject-expense-suggestion.use-case';

function build() {
  const expenses = new InMemoryExpenses();
  const suggestions = suggestionRepositoryOf(expenses);
  const valuation = new FakeValuation();
  const lots = new FakeLotReader();
  const categories = new FakeCategoryReader();
  const clock = new FixedClock();
  return {
    expenses,
    suggestions,
    valuation,
    create: new CreateExpenseSuggestionUseCase(
      expenses,
      suggestions,
      lots,
      categories,
    ),
    find: new FindExpenseSuggestionsUseCase(suggestions),
    approve: new ApproveExpenseSuggestionUseCase(
      expenses,
      suggestions,
      lots,
      categories,
      valuation,
      clock,
    ),
    reject: new RejectExpenseSuggestionUseCase(suggestions, clock),
  };
}

const sup = { companyId: 'company-1', tenantId: 'tenant-1', userId: 'sup-1' };
const admin = {
  companyId: 'company-1',
  tenantId: 'tenant-1',
  userId: 'admin-1',
};

describe('CreateExpenseSuggestionUseCase (R-FIN-11)', () => {
  it('leaves an EDICION PENDIENTE with the proposed values and the author; the expense does not change', async () => {
    const { create, expenses } = build();
    const seeded = expenses.seed();

    const suggestion = await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: {
        kind: 'EDICION',
        amount: '120000',
        description: 'Flete corregido',
      },
    });

    expect(suggestion).toMatchObject({
      kind: 'EDICION',
      status: 'PENDIENTE',
      suggestedBy: 'sup-1',
      resolvedBy: null,
      proposed: {
        amount: '120000',
        description: 'Flete corregido',
        unit: null,
        grain: null,
        lotId: null,
        categoryId: null,
        date: null,
      },
    });
    expect(expenses.expenses.get(seeded.id)).toEqual(seeded);
  });

  it('creates a BAJA suggestion that carries no proposed values', async () => {
    const { create, expenses } = build();
    const seeded = expenses.seed();

    const suggestion = await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: { kind: 'BAJA', amount: '5' },
    });

    expect(suggestion.kind).toBe('BAJA');
    expect(suggestion.proposed.amount).toBeNull();
    expect(expenses.deleted.size).toBe(0);
  });

  it('answers 409 to a second suggestion while one is pending', async () => {
    const { create, expenses, suggestions } = build();
    const seeded = expenses.seed();
    await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: { kind: 'BAJA' },
    });

    await expect(
      create.execute({
        ...sup,
        expenseId: seeded.id,
        body: { kind: 'EDICION', amount: '1' },
      }),
    ).rejects.toBeInstanceOf(PendingSuggestionError);
    expect(await suggestions.findAll({ companyId: 'company-1' })).toHaveLength(
      1,
    );
  });

  it('allows a new suggestion once the previous one was resolved', async () => {
    const { create, reject, expenses } = build();
    const seeded = expenses.seed();
    const first = await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: { kind: 'BAJA' },
    });
    await reject.execute({ ...admin, id: first.id, reason: 'no corresponde' });

    await expect(
      create.execute({ ...sup, expenseId: seeded.id, body: { kind: 'BAJA' } }),
    ).resolves.toMatchObject({ status: 'PENDIENTE' });
  });

  it('rejects an unknown kind, an empty edition and invalid money with InvalidInputError', async () => {
    const { create, expenses } = build();
    const seeded = expenses.seed();

    await expect(
      create.execute({ ...sup, expenseId: seeded.id, body: { kind: 'OTRA' } }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      create.execute({
        ...sup,
        expenseId: seeded.id,
        body: { kind: 'EDICION' },
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      create.execute({
        ...sup,
        expenseId: seeded.id,
        body: { kind: 'EDICION', unit: 'KG_CEREAL' },
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it('answers not found for an expense of another firma or a deleted one, and for foreign lot or category', async () => {
    const { create, expenses } = build();
    const foreign = expenses.seed({ companyId: 'company-2' });
    const own = expenses.seed();
    const gone = expenses.seed();
    expenses.deleted.set(gone.id, { at: NOW, by: 'admin-1' });

    for (const id of [foreign.id, gone.id]) {
      await expect(
        create.execute({ ...sup, expenseId: id, body: { kind: 'BAJA' } }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    }
    await expect(
      create.execute({
        ...sup,
        expenseId: own.id,
        body: { kind: 'EDICION', lotId: 'lot-foreign' },
      }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
    await expect(
      create.execute({
        ...sup,
        expenseId: own.id,
        body: { kind: 'EDICION', categoryId: 'cat-off' },
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe('FindExpenseSuggestionsUseCase (visibility by role)', () => {
  async function seedThree() {
    const ctx = build();
    const a = ctx.expenses.seed();
    const b = ctx.expenses.seed();
    const c = ctx.expenses.seed();
    const other = ctx.expenses.seed({ companyId: 'company-2' });
    const s1 = await ctx.create.execute({
      ...sup,
      expenseId: a.id,
      body: { kind: 'BAJA' },
    });
    await ctx.create.execute({
      ...sup,
      userId: 'sup-2',
      expenseId: b.id,
      body: { kind: 'BAJA' },
    });
    await ctx.reject.execute({ ...admin, id: s1.id, reason: 'monto correcto' });
    await ctx.suggestions.create({
      expenseId: other.id,
      companyId: 'company-2',
      kind: 'BAJA',
      proposed: null,
      suggestedBy: 'sup-1',
    });
    void c;
    return ctx;
  }

  it('shows the ADMIN every suggestion of the firma, filterable by status', async () => {
    const { find } = await seedThree();

    const all = await find.execute({
      role: 'ADMIN',
      userId: 'admin-1',
      companyId: 'company-1',
    });
    const pending = await find.execute({
      role: 'ADMIN',
      userId: 'admin-1',
      companyId: 'company-1',
      status: 'PENDIENTE',
    });

    expect(all).toHaveLength(2);
    expect(pending).toHaveLength(1);
  });

  it('shows the SUPERVISOR only their own suggestions, with status and rejection reason, never other supervisors', async () => {
    const { find } = await seedThree();

    const mine = await find.execute({
      role: 'SUPERVISOR',
      userId: 'sup-1',
      companyId: 'company-1',
    });

    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      suggestedBy: 'sup-1',
      status: 'RECHAZADA',
      rejectionReason: 'monto correcto',
    });
  });

  it('rejects an unknown status filter with InvalidInputError', async () => {
    const { find } = build();

    await expect(
      find.execute({
        role: 'ADMIN',
        userId: 'a',
        companyId: 'company-1',
        status: 'X',
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe('ApproveExpenseSuggestionUseCase (R-FIN-11)', () => {
  it('applies the proposed values, revalues with the prices of that day and marks APROBADA with the resolver', async () => {
    const { create, approve, expenses, valuation, suggestions } = build();
    const seeded = expenses.seed();
    const s = await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: {
        kind: 'EDICION',
        amount: '300',
        unit: 'KG_CEREAL',
        grain: 'MAIZ',
      },
    });

    const resolved = await approve.execute({ ...admin, id: s.id });

    expect(valuation.calls).toEqual([
      { amount: '300', unit: 'KG_CEREAL', grain: 'MAIZ' },
    ]);
    expect(expenses.expenses.get(seeded.id)).toMatchObject({
      amount: '300',
      unit: 'KG_CEREAL',
      grain: 'MAIZ',
      amountArs: '58500.00',
      valuedAt: NOW,
      updatedBy: 'admin-1',
    });
    expect(resolved).toMatchObject({
      status: 'APROBADA',
      resolvedBy: 'admin-1',
      resolvedAt: NOW,
    });
    expect((await suggestions.findById(s.id, 'company-1'))?.status).toBe(
      'APROBADA',
    );
  });

  it('keeps the original valuation when the suggestion only changes the category', async () => {
    const { create, approve, expenses, valuation } = build();
    const seeded = expenses.seed({
      amountArs: '90000.0000',
      valuedAt: new Date('2026-11-01T00:00:00Z'),
    });
    const s = await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: { kind: 'EDICION', categoryId: 'cat-2' },
    });

    await approve.execute({ ...admin, id: s.id });

    expect(valuation.calls).toHaveLength(0);
    expect(expenses.expenses.get(seeded.id)).toMatchObject({
      categoryId: 'cat-2',
      amountArs: '90000.0000',
      valuedAt: new Date('2026-11-01T00:00:00Z'),
      updatedBy: 'admin-1',
    });
  });

  it('approving a BAJA soft-deletes the expense and the supervisor still sees the suggestion APROBADA', async () => {
    const { create, approve, find, expenses } = build();
    const seeded = expenses.seed();
    const s = await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: { kind: 'BAJA' },
    });

    await approve.execute({ ...admin, id: s.id });

    expect(expenses.deleted.get(seeded.id)).toEqual({ at: NOW, by: 'admin-1' });
    await expect(expenses.findAll('company-1', {})).resolves.toEqual([]);
    const mine = await find.execute({
      role: 'SUPERVISOR',
      userId: 'sup-1',
      companyId: 'company-1',
    });
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      status: 'APROBADA',
      expense: { id: seeded.id, deleted: true },
    });
  });

  it('is final: a second approve or reject answers 409', async () => {
    const { create, approve, reject, expenses } = build();
    const seeded = expenses.seed();
    const s = await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: { kind: 'BAJA' },
    });
    await approve.execute({ ...admin, id: s.id });

    await expect(
      approve.execute({ ...admin, id: s.id }),
    ).rejects.toBeInstanceOf(SuggestionAlreadyResolvedError);
    await expect(
      reject.execute({ ...admin, id: s.id, reason: 'tarde' }),
    ).rejects.toBeInstanceOf(SuggestionAlreadyResolvedError);
  });

  it('answers not found for a suggestion of another firma and propagates a market failure without resolving', async () => {
    const { create, approve, expenses, valuation, suggestions } = build();
    const seeded = expenses.seed();
    const s = await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: { kind: 'EDICION', unit: 'USD' },
    });

    await expect(
      approve.execute({ ...admin, companyId: 'company-2', id: s.id }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    valuation.unavailable = true;
    await expect(approve.execute({ ...admin, id: s.id })).rejects.toThrow();
    expect((await suggestions.findById(s.id, 'company-1'))?.status).toBe(
      'PENDIENTE',
    );
    expect(expenses.expenses.get(seeded.id)?.unit).toBe('ARS');
  });

  it('refuses to approve an edition whose category was deactivated meanwhile (400) and leaves it PENDIENTE', async () => {
    const { create, suggestions, expenses } = build();
    const seeded = expenses.seed();
    const s = await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: { kind: 'EDICION', categoryId: 'cat-2' },
    });
    // The category stops being active after the suggestion was made.
    const categories = new FakeCategoryReader();
    categories.categories.set('cat-2', { tenantId: 'tenant-1', active: false });
    const strict = new ApproveExpenseSuggestionUseCase(
      expenses,
      suggestions,
      new FakeLotReader(),
      categories,
      new FakeValuation(),
      new FixedClock(),
    );

    await expect(strict.execute({ ...admin, id: s.id })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect((await suggestions.findById(s.id, 'company-1'))?.status).toBe(
      'PENDIENTE',
    );
  });
});

describe('RejectExpenseSuggestionUseCase (R-FIN-11)', () => {
  it('rejects with a mandatory reason, records the resolver and leaves the expense as it was', async () => {
    const { create, reject, expenses } = build();
    const seeded = expenses.seed();
    const s = await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: { kind: 'BAJA' },
    });

    const resolved = await reject.execute({
      ...admin,
      id: s.id,
      reason: '  monto correcto ',
    });

    expect(resolved).toMatchObject({
      status: 'RECHAZADA',
      rejectionReason: 'monto correcto',
      resolvedBy: 'admin-1',
      resolvedAt: NOW,
    });
    expect(expenses.deleted.size).toBe(0);
    expect(expenses.expenses.get(seeded.id)).toEqual(seeded);
  });

  it('answers 400 without a reason and the suggestion stays PENDIENTE, before any port is read', async () => {
    const { create, reject, expenses, suggestions } = build();
    const seeded = expenses.seed();
    const s = await create.execute({
      ...sup,
      expenseId: seeded.id,
      body: { kind: 'BAJA' },
    });

    await expect(
      reject.execute({ ...admin, id: s.id, reason: '   ' }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      reject.execute({ ...admin, id: 'missing', reason: undefined }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect((await suggestions.findById(s.id, 'company-1'))?.status).toBe(
      'PENDIENTE',
    );
  });

  it('answers not found for a suggestion of another firma', async () => {
    const { reject } = build();

    await expect(
      reject.execute({ ...admin, id: 'missing', reason: 'x' }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });
});
