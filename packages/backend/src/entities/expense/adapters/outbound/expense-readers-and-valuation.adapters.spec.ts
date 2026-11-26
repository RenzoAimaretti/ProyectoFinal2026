import { ValueMoneyUseCase } from '../../../valuation/application/use-cases/value-money.use-case';
import { MarketUnavailableError } from '../../../valuation/domain/errors';
import { PrismaExpenseCategoryReader } from './prisma-expense-category.reader';
import { PrismaLotReader } from './prisma-lot.reader';
import { SystemClock } from './system-clock';
import { ValuationMoneyValuationAdapter } from './valuation-money-valuation.adapter';

describe('PrismaLotReader (tenant isolation)', () => {
  it('reaches the tenant through lot -> farm -> client and ignores deleted lots', async () => {
    const lot = { findFirst: jest.fn().mockResolvedValue({ id: 'lot-1' }) };
    const reader = new PrismaLotReader({ lot } as never);

    await expect(reader.findInTenant('lot-1', 'tenant-1')).resolves.toEqual({
      id: 'lot-1',
    });

    expect(lot.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'lot-1',
        deleted: false,
        farm: { client: { tenantId: 'tenant-1' } },
      },
      select: { id: true },
    });
  });

  it('returns null for a lot of another tenant', async () => {
    const lot = { findFirst: jest.fn().mockResolvedValue(null) };
    const reader = new PrismaLotReader({ lot } as never);

    await expect(reader.findInTenant('lot-x', 'tenant-1')).resolves.toBeNull();
  });
});

describe('PrismaExpenseCategoryReader', () => {
  it('looks the category up by id within the tenant and returns its active flag', async () => {
    const expenseCategory = {
      findFirst: jest.fn().mockResolvedValue({ id: 'cat-1', active: false }),
    };
    const reader = new PrismaExpenseCategoryReader({
      expenseCategory,
    } as never);

    await expect(reader.findInTenant('cat-1', 'tenant-1')).resolves.toEqual({
      id: 'cat-1',
      active: false,
    });
    expect(expenseCategory.findFirst).toHaveBeenCalledWith({
      where: { id: 'cat-1', tenantId: 'tenant-1' },
      select: { id: true, active: true },
    });
  });
});

describe('ValuationMoneyValuationAdapter (expense)', () => {
  const valued = {
    amountArs: '58500.00',
    grainArsPerTon: '195000',
    usdRate: null,
    usdRateType: null,
    grainSource: 'cac.bcr.com.ar',
    usdSource: null,
    priceFetchedAt: new Date('2026-11-23T10:00:00Z'),
    priceStale: true,
  };

  it('maps the valuation and names the source of the price that was used', async () => {
    const valueMoney = { execute: jest.fn().mockResolvedValue(valued) };
    const adapter = new ValuationMoneyValuationAdapter(
      valueMoney as unknown as ValueMoneyUseCase,
    );

    const result = await adapter.valueToArs({
      amount: '300',
      unit: 'KG_CEREAL',
      grain: 'MAIZ',
    });

    expect(valueMoney.execute).toHaveBeenCalledWith({
      amount: '300',
      unit: 'KG_CEREAL',
      grain: 'MAIZ',
    });
    expect(result).toEqual({
      amountArs: '58500.00',
      grainArsPerTon: '195000',
      usdRate: null,
      usdRateType: null,
      priceSource: 'cac.bcr.com.ar',
      priceFetchedAt: new Date('2026-11-23T10:00:00Z'),
      priceStale: true,
    });
  });

  it('uses the USD source for a USD expense and keeps priceSource null for ARS', async () => {
    const valueMoney = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({
          ...valued,
          grainSource: null,
          usdSource: 'dolarapi.com',
          usdRate: '1000',
          usdRateType: 'OFICIAL_VENTA',
        })
        .mockResolvedValueOnce({
          ...valued,
          grainSource: null,
          grainArsPerTon: null,
          priceFetchedAt: null,
          priceStale: false,
        }),
    };
    const adapter = new ValuationMoneyValuationAdapter(
      valueMoney as unknown as ValueMoneyUseCase,
    );

    await expect(
      adapter.valueToArs({ amount: '10', unit: 'USD', grain: null }),
    ).resolves.toMatchObject({
      priceSource: 'dolarapi.com',
      usdRate: '1000',
      usdRateType: 'OFICIAL_VENTA',
    });
    await expect(
      adapter.valueToArs({ amount: '10', unit: 'ARS', grain: null }),
    ).resolves.toMatchObject({
      priceSource: null,
    });
  });

  it('lets MarketUnavailableError through so the expense is rejected with 503 (D25)', async () => {
    const valueMoney = {
      execute: jest.fn().mockRejectedValue(new MarketUnavailableError('x')),
    };
    const adapter = new ValuationMoneyValuationAdapter(
      valueMoney as unknown as ValueMoneyUseCase,
    );

    await expect(
      adapter.valueToArs({ amount: '10', unit: 'USD', grain: null }),
    ).rejects.toBeInstanceOf(MarketUnavailableError);
  });
});

describe('SystemClock', () => {
  it('returns the current instant', () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
  });
});
