import { Dec } from '../../domain/decimal';
import { EntityNotFoundError } from '../../domain/errors';
import { Money } from '../../domain/money';
import { ValuationTariff } from '../../domain/valuation.rules';
import {
  FETCHED_AT,
  FakeMarketPrice,
  FakeTariffReader,
  FixedClock,
  InMemoryDailyReportReader,
  InMemoryValuationRepository,
  NOW,
  marketSnapshot,
  report,
} from '../valuation.test-fakes';
import {
  SaveValuationResult,
  ValuationRepositoryPort,
} from '../ports/valuation-repository.port';
import { ValuateDailyReportUseCase } from './valuate-daily-report.use-case';

const money = (
  amount: string,
  unit: Money['unit'],
  grain: Money['grain'] = null,
): Money => ({ amount: Dec.parse(amount), unit, grain });

const tariff = (price: Money, cost: Money): ValuationTariff => ({
  id: 'tariff-1',
  price: { money: price, basis: 'POR_HECTAREA' },
  cost: { money: cost, basis: 'POR_HORA' },
});

function harness(options: {
  tariff?: ValuationTariff | null;
  market?: FakeMarketPrice;
  repository?: ValuationRepositoryPort;
}) {
  const store = new InMemoryValuationRepository();
  const repository = options.repository ?? store;
  const tariffs = new FakeTariffReader(
    options.tariff ? { 'company-1|labor-1': options.tariff } : {},
  );
  const market = options.market ?? new FakeMarketPrice();
  const reports = new InMemoryDailyReportReader([report()], store);
  const useCase = new ValuateDailyReportUseCase(
    tariffs,
    reports,
    market,
    repository,
    new FixedClock(),
  );
  return { store, tariffs, market, useCase };
}

const input = { companyId: 'company-1', reportId: 'report-1' };

describe('ValuateDailyReportUseCase', () => {
  it('reports SIN_TARIFA and persists nothing when the pair has no tariff', async () => {
    const { store, market, tariffs, useCase } = harness({ tariff: null });

    await expect(useCase.execute(input)).resolves.toEqual({
      reportId: 'report-1',
      result: 'SIN_TARIFA',
    });

    expect(tariffs.calls).toEqual([['company-1', 'labor-1']]);
    expect(market.needs).toEqual([]);
    expect(store.attempts).toEqual([]);
  });

  it('reports PRECIO_NO_DISPONIBLE and saves no partial snapshot when the dollar is down', async () => {
    const { store, market, useCase } = harness({
      tariff: tariff(money('100', 'USD'), money('8000', 'ARS')),
      market: new FakeMarketPrice(marketSnapshot({ usd: null })),
    });

    await expect(useCase.execute(input)).resolves.toEqual({
      reportId: 'report-1',
      result: 'PRECIO_NO_DISPONIBLE',
    });

    expect(market.needs).toEqual([
      { grains: [], usd: true, usdRateType: 'OFICIAL_VENTA' },
    ]);
    expect(store.attempts).toEqual([]);
  });

  it('values an ARS-only tariff without asking the market anything', async () => {
    const { store, market, useCase } = harness({
      tariff: tariff(money('5000', 'ARS'), money('8000', 'ARS')),
    });

    await expect(useCase.execute(input)).resolves.toEqual({
      reportId: 'report-1',
      result: 'VALUADO',
    });

    expect(market.needs).toEqual([]);
    const saved = store.records.get('report-1');
    expect(saved?.computation.incomeArs.toString()).toBe('62500.00');
    // Cost is only tariff cost x hours: consumed inputs never enter the cost.
    expect(saved?.computation.costArs.toString()).toBe('48000.00');
    expect(saved?.computation.priceFetchedAt).toBeNull();
  });

  it('persists the snapshot with the rate, source, rate type and valuation date', async () => {
    const { store, market, useCase } = harness({
      tariff: tariff(money('100', 'USD'), money('8000', 'ARS')),
    });

    await useCase.execute(input);

    expect(market.needs).toEqual([
      { grains: [], usd: true, usdRateType: 'OFICIAL_VENTA' },
    ]);
    const saved = store.records.get('report-1');
    expect(saved).toMatchObject({
      dailyReportId: 'report-1',
      companyId: 'company-1',
      lotId: 'lot-1',
      origin: 'APROBACION',
      valuedAt: NOW,
    });
    expect(saved?.tariff.id).toBe('tariff-1');
    expect(saved?.tariff.price.money.unit).toBe('USD');
    expect(saved?.computation.incomeNative.toString()).toBe('1250.0000');
    expect(saved?.computation.incomeArs.toString()).toBe('1912500.00');
    expect(saved?.computation.usdRate?.toString()).toBe('1530');
    expect(saved?.computation.usdRateType).toBe('OFICIAL_VENTA');
    expect(saved?.computation.usdSource).toBe('dolarapi.com');
    expect(saved?.computation.priceFetchedAt).toEqual(FETCHED_AT);
    expect(saved?.computation.priceStale).toBe(false);
  });

  it('values with a stale cached price and records that it was stale', async () => {
    const { store, market, useCase } = harness({
      tariff: tariff(money('48', 'KG_CEREAL', 'SOJA'), money('8000', 'ARS')),
      market: new FakeMarketPrice(
        marketSnapshot({ stale: { grains: true, usd: false } }),
      ),
    });

    await expect(useCase.execute(input)).resolves.toMatchObject({
      result: 'VALUADO',
    });

    expect(market.needs).toEqual([
      { grains: ['SOJA'], usd: false, usdRateType: 'OFICIAL_VENTA' },
    ]);
    const saved = store.records.get('report-1');
    expect(saved?.computation.priceStale).toBe(true);
    expect(saved?.computation.priceFetchedAt).toEqual(FETCHED_AT);
    expect(saved?.computation.incomeArs.toString()).toBe('186000.00');
  });

  it('reports YA_VALORIZADO when the report already has a snapshot', async () => {
    const alreadyThere: ValuationRepositoryPort = {
      saveIfAbsent: (): Promise<SaveValuationResult> =>
        Promise.resolve('ALREADY_EXISTS'),
    };
    const { useCase } = harness({
      tariff: tariff(money('5000', 'ARS'), money('8000', 'ARS')),
      repository: alreadyThere,
    });

    await expect(useCase.execute(input)).resolves.toEqual({
      reportId: 'report-1',
      result: 'YA_VALORIZADO',
    });
  });

  it('refuses a report that is not an approved report of the company', async () => {
    const { store, useCase } = harness({
      tariff: tariff(money('5000', 'ARS'), money('8000', 'ARS')),
    });

    await expect(
      useCase.execute({ companyId: 'company-2', reportId: 'report-1' }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
    await expect(
      useCase.execute({ companyId: 'company-1', reportId: 'missing' }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
    expect(store.attempts).toEqual([]);
  });
});
