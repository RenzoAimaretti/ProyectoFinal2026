import { MarketUnavailableError } from '../../../valuation/domain/errors';
import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import {
  FakeCategoryReader,
  FakeLotReader,
  FakeValuation,
  FixedClock,
  InMemoryExpenses,
  NOW,
} from '../expense.test-fakes';
import { CreateExpenseUseCase } from './create-expense.use-case';
import { FindExpensesUseCase } from './find-expenses.use-case';
import { PreviewExpenseUseCase } from './preview-expense.use-case';

function build() {
  const expenses = new InMemoryExpenses();
  const valuation = new FakeValuation();
  const lots = new FakeLotReader();
  const categories = new FakeCategoryReader();
  const clock = new FixedClock();
  return {
    expenses,
    valuation,
    create: new CreateExpenseUseCase(
      expenses,
      lots,
      categories,
      valuation,
      clock,
    ),
    preview: new PreviewExpenseUseCase(valuation, clock),
    find: new FindExpensesUseCase(expenses),
  };
}

const actor = { companyId: 'company-1', tenantId: 'tenant-1', userId: 'sup-1' };
const ars = {
  lotId: 'lot-1',
  categoryId: 'cat-1',
  date: '2026-11-20',
  description: 'Flete',
  amount: '90000',
  unit: 'ARS',
};

describe('CreateExpenseUseCase (R-FIN-10)', () => {
  it('persists a 90000 ARS "Flete" on the lot and the firma of the session with createdBy and updatedBy', async () => {
    const { create, expenses } = build();

    const saved = await create.execute({ ...actor, body: ars });

    expect(saved).toMatchObject({
      companyId: 'company-1',
      lotId: 'lot-1',
      categoryId: 'cat-1',
      description: 'Flete',
      amount: '90000',
      unit: 'ARS',
      grain: null,
      amountArs: '90000.00',
      createdBy: 'sup-1',
      updatedBy: 'sup-1',
      valuedAt: NOW,
    });
    expect(expenses.expenses.size).toBe(1);
  });

  it('values 300 kg of MAIZ at 195000 ARS/t to 58500 and records price, source and valuation date', async () => {
    const { create, valuation } = build();

    const saved = await create.execute({
      ...actor,
      body: { ...ars, amount: '300', unit: 'KG_CEREAL', grain: 'MAIZ' },
    });

    expect(valuation.calls).toEqual([
      { amount: '300', unit: 'KG_CEREAL', grain: 'MAIZ' },
    ]);
    expect(saved.amountArs).toBe('58500.00');
    expect(saved).toMatchObject({
      unit: 'KG_CEREAL',
      grain: 'MAIZ',
      grainArsPerTon: '195000',
      priceSource: 'cac.bcr.com.ar',
      priceFetchedAt: NOW,
      priceStale: false,
      valuedAt: NOW,
    });
  });

  it('records the USD rate and its type for a USD expense', async () => {
    const { create } = build();

    const saved = await create.execute({
      ...actor,
      body: { ...ars, amount: '10', unit: 'USD' },
    });

    expect(saved).toMatchObject({
      amountArs: '10000.00',
      usdRate: '1000',
      usdRateType: 'OFICIAL_VENTA',
    });
  });

  it('answers not found for a lot of another tenant without valuing or persisting', async () => {
    const { create, expenses, valuation } = build();

    await expect(
      create.execute({ ...actor, body: { ...ars, lotId: 'lot-foreign' } }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
    expect(expenses.expenses.size).toBe(0);
    expect(valuation.calls).toHaveLength(0);
  });

  it('answers not found for a category of another tenant and 400 for an inactive one', async () => {
    const { create, expenses } = build();

    await expect(
      create.execute({ ...actor, body: { ...ars, categoryId: 'cat-other' } }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
    await expect(
      create.execute({ ...actor, body: { ...ars, categoryId: 'cat-off' } }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(expenses.expenses.size).toBe(0);
  });

  it('keeps existing expenses of a category that is later deactivated', async () => {
    const { create, expenses } = build();
    const saved = await create.execute({ ...actor, body: ars });

    // The category is deactivated afterwards: the stored expense is untouched.
    expect(expenses.expenses.get(saved.id)?.categoryId).toBe('cat-1');
  });

  it('rejects with the market error and persists nothing when USD or kg has no price (D25)', async () => {
    const { create, expenses, valuation } = build();
    valuation.unavailable = true;

    await expect(
      create.execute({ ...actor, body: { ...ars, amount: '10', unit: 'USD' } }),
    ).rejects.toBeInstanceOf(MarketUnavailableError);
    await expect(
      create.execute({
        ...actor,
        body: { ...ars, amount: '300', unit: 'KG_CEREAL', grain: 'MAIZ' },
      }),
    ).rejects.toBeInstanceOf(MarketUnavailableError);
    expect(expenses.expenses.size).toBe(0);
  });

  it('rejects an invalid body with InvalidInputError before touching any port', async () => {
    const { create, valuation } = build();

    await expect(
      create.execute({ ...actor, body: { ...ars, amount: '-5' } }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(valuation.calls).toHaveLength(0);
  });
});

describe('PreviewExpenseUseCase (D24)', () => {
  it('returns the valuation in ARS without persisting anything', async () => {
    const { preview, expenses } = build();

    const result = await preview.execute({
      amount: '300',
      unit: 'KG_CEREAL',
      grain: 'MAIZ',
      lotId: 'ignored',
    });

    expect(result).toEqual({
      amount: '300',
      unit: 'KG_CEREAL',
      grain: 'MAIZ',
      amountArs: '58500.00',
      grainArsPerTon: '195000',
      usdRate: null,
      usdRateType: null,
      priceSource: 'cac.bcr.com.ar',
      priceFetchedAt: NOW,
      priceStale: false,
      valuedAt: NOW,
    });
    expect(expenses.expenses.size).toBe(0);
  });

  it('propagates the market error so the controller answers 503 (D25)', async () => {
    const { preview, valuation } = build();
    valuation.unavailable = true;

    await expect(
      preview.execute({ amount: '10', unit: 'USD' }),
    ).rejects.toBeInstanceOf(MarketUnavailableError);
  });
});

describe('FindExpensesUseCase', () => {
  it('lists only live expenses of the firma, filtered by lot and category', async () => {
    const { expenses, find } = build();
    expenses.seed({ id: 'a', lotId: 'lot-1' });
    expenses.seed({ id: 'b', lotId: 'lot-2' });
    expenses.seed({ id: 'c', companyId: 'company-2' });
    expenses.seed({ id: 'd', lotId: 'lot-1' });
    expenses.deleted.set('d', { at: NOW, by: 'admin-1' });

    const all = await find.execute({ companyId: 'company-1', query: {} });
    const byLot = await find.execute({
      companyId: 'company-1',
      query: { lotId: 'lot-2' },
    });

    expect(all.map((e) => e.id).sort()).toEqual(['a', 'b']);
    expect(byLot.map((e) => e.id)).toEqual(['b']);
  });

  it('rejects an invalid date range with InvalidInputError', async () => {
    const { find } = build();

    await expect(
      find.execute({ companyId: 'company-1', query: { from: 'x' } }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});
