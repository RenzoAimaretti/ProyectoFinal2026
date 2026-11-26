import { InvalidInputError } from '../../domain/errors';
import {
  FakeLaborTypeReader,
  FakePendingValuationRetry,
  FakeMoneyValuation,
  FixedClock,
  InMemoryTariffRepository,
} from '../tariff.test-fakes';
import { GetTariffKgEquivalentsUseCase } from './get-tariff-kg-equivalents.use-case';
import { UpsertTariffUseCase } from './upsert-tariff.use-case';

function harness(valuation: FakeMoneyValuation) {
  const repository = new InMemoryTariffRepository();
  const upsert = new UpsertTariffUseCase(
    repository,
    new FakeLaborTypeReader(['t|l1', 't|l2', 't|l3']),
    new FakePendingValuationRetry(),
  );
  const save = (laborTypeId: string, price: object, cost: object) =>
    upsert.execute({
      companyId: 'c1',
      tenantId: 't',
      userId: 'u',
      laborTypeId,
      price,
      cost,
    });
  const useCase = new GetTariffKgEquivalentsUseCase(
    repository,
    valuation,
    new FixedClock(),
  );
  return { useCase, save };
}

const soy = (price: string | null = '310000') =>
  new FakeMoneyValuation({ SOJA: price, TRIGO: '200000' }, '1580');

describe('GetTariffKgEquivalentsUseCase', () => {
  it('expresses an ARS amount in kilos of soy (186000 ARS at 310000 ARS/t = 600 kg)', async () => {
    const { useCase, save } = harness(soy());
    await save(
      'l1',
      { amount: '186000', unit: 'ARS', basis: 'POR_HECTAREA' },
      { amount: '93000', unit: 'ARS', basis: 'POR_HORA' },
    );

    const result = await useCase.execute({ companyId: 'c1', grain: 'SOJA' });

    expect(result.grain).toBe('SOJA');
    expect(result.grainArsPerTon).toBe('310000');
    expect(result.items).toEqual([
      {
        tariffId: expect.any(String) as string,
        laborTypeId: 'l1',
        priceKg: '600.00',
        costKg: '300.00',
      },
    ]);
    expect(result.calculatedAt).toEqual(new Date('2026-11-23T12:00:00Z'));
  });

  it('defaults to soy when no grain is chosen', async () => {
    const { useCase, save } = harness(soy());
    await save(
      'l1',
      { amount: '310', unit: 'ARS', basis: 'POR_HORA' },
      { amount: '0', unit: 'ARS', basis: 'POR_HORA' },
    );

    const result = await useCase.execute({ companyId: 'c1', grain: undefined });

    expect(result.grain).toBe('SOJA');
    expect(result.items[0].priceKg).toBe('1.00');
    expect(result.items[0].costKg).toBe('0.00');
  });

  it('converts USD with the same valuation policy before expressing it in kilos', async () => {
    const { useCase, save } = harness(soy());
    await save(
      'l1',
      { amount: '100', unit: 'USD', basis: 'POR_HECTAREA' },
      { amount: '1', unit: 'ARS', basis: 'POR_HORA' },
    );

    const result = await useCase.execute({ companyId: 'c1', grain: 'SOJA' });

    // 100 USD * 1580 = 158000 ARS -> 158000 * 1000 / 310000 = 509.68 kg
    expect(result.items[0].priceKg).toBe('509.68');
  });

  it('recalculates with the price of another grain', async () => {
    const { useCase, save } = harness(soy());
    await save(
      'l1',
      { amount: '200000', unit: 'ARS', basis: 'POR_HECTAREA' },
      { amount: '1', unit: 'ARS', basis: 'POR_HORA' },
    );

    const result = await useCase.execute({ companyId: 'c1', grain: 'TRIGO' });

    expect(result.grain).toBe('TRIGO');
    expect(result.items[0].priceKg).toBe('1000.00');
  });

  it('keeps an amount already in kilos of the chosen grain as is, and leaves other grains as null', async () => {
    const { useCase, save } = harness(soy());
    await save(
      'l1',
      { amount: '12', unit: 'KG_CEREAL', grain: 'SOJA', basis: 'POR_HECTAREA' },
      { amount: '5', unit: 'KG_CEREAL', grain: 'TRIGO', basis: 'POR_HORA' },
    );

    const result = await useCase.execute({ companyId: 'c1', grain: 'SOJA' });

    expect(result.items[0].priceKg).toBe('12');
    expect(result.items[0].costKg).toBeNull();
  });

  it('answers null (not 0) for every item when the grain has no price ("S/C")', async () => {
    const { useCase, save } = harness(soy(null));
    await save(
      'l1',
      { amount: '186000', unit: 'ARS', basis: 'POR_HECTAREA' },
      { amount: '1', unit: 'ARS', basis: 'POR_HORA' },
    );

    const result = await useCase.execute({ companyId: 'c1', grain: 'SOJA' });

    expect(result.grainArsPerTon).toBeNull();
    expect(result.items[0].priceKg).toBeNull();
    expect(result.items[0].costKg).toBeNull();
  });

  it('answers null for a USD amount when the dollar is unavailable, keeping the ARS ones', async () => {
    const { useCase, save } = harness(
      new FakeMoneyValuation({ SOJA: '310000' }, null),
    );
    await save(
      'l1',
      { amount: '100', unit: 'USD', basis: 'POR_HECTAREA' },
      { amount: '310', unit: 'ARS', basis: 'POR_HORA' },
    );

    const result = await useCase.execute({ companyId: 'c1', grain: 'SOJA' });

    expect(result.items[0].priceKg).toBeNull();
    expect(result.items[0].costKg).toBe('1.00');
  });

  it('rejects an unknown grain with InvalidInputError', async () => {
    const { useCase } = harness(soy());

    await expect(
      useCase.execute({ companyId: 'c1', grain: 'CEBADA' }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      useCase.execute({ companyId: 'c1', grain: 'soja' }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it('only reads the tariffs of the session company', async () => {
    const { useCase } = harness(soy());

    const result = await useCase.execute({
      companyId: 'other-company',
      grain: 'SOJA',
    });

    expect(result.items).toEqual([]);
  });
});
