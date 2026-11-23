import { Dec } from '../../domain/decimal';
import { Money } from '../../domain/money';
import { ValuationTariff } from '../../domain/valuation.rules';
import {
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
  ValuationRecord,
  ValuationRepositoryPort,
} from '../ports/valuation-repository.port';
import { RetryPendingValuationsUseCase } from './retry-pending-valuations.use-case';

const money = (
  amount: string,
  unit: Money['unit'],
  grain: Money['grain'] = null,
): Money => ({ amount: Dec.parse(amount), unit, grain });

const arsTariff: ValuationTariff = {
  id: 'tariff-1',
  price: { money: money('5000', 'ARS'), basis: 'POR_HECTAREA' },
  cost: { money: money('8000', 'ARS'), basis: 'POR_HORA' },
};

function harness(
  reports = [
    report({ id: 'report-1' }),
    report({ id: 'report-2' }),
    report({ id: 'report-3' }),
  ],
  options: {
    tariffs?: Record<string, ValuationTariff>;
    market?: FakeMarketPrice;
    repository?: (
      store: InMemoryValuationRepository,
    ) => ValuationRepositoryPort;
  } = {},
) {
  const store = new InMemoryValuationRepository();
  const reader = new InMemoryDailyReportReader(reports, store);
  const market = options.market ?? new FakeMarketPrice();
  const useCase = new RetryPendingValuationsUseCase(
    new FakeTariffReader(options.tariffs ?? { 'company-1|labor-1': arsTariff }),
    reader,
    market,
    options.repository ? options.repository(store) : store,
    new FixedClock(),
  );
  return { store, reader, market, useCase };
}

describe('RetryPendingValuationsUseCase', () => {
  it('values every pending report of the pair and marks the snapshots as late (REINTENTO)', async () => {
    const { store, reader, useCase } = harness();

    const result = await useCase.execute({
      companyId: 'company-1',
      laborTypeId: 'labor-1',
    });

    expect(reader.queries).toEqual([
      { companyId: 'company-1', laborTypeId: 'labor-1', limit: 200 },
    ]);
    expect(result).toMatchObject({
      processed: 3,
      valued: 3,
      withoutTariff: 0,
      priceUnavailable: 0,
      alreadyValued: 0,
      failures: [],
    });
    expect([...store.records.values()].map((r) => r.origin)).toEqual([
      'REINTENTO',
      'REINTENTO',
      'REINTENTO',
    ]);
    expect([...store.records.values()].map((r) => r.valuedAt)).toEqual([
      NOW,
      NOW,
      NOW,
    ]);
  });

  it('retries every labor of the company when no labor type is given', async () => {
    const { reader, useCase } = harness();

    await useCase.execute({ companyId: 'company-1' });

    expect(reader.queries).toEqual([{ companyId: 'company-1', limit: 200 }]);
  });

  it('honours an explicit limit', async () => {
    const { store, reader, useCase } = harness();

    const result = await useCase.execute({ companyId: 'company-1', limit: 2 });

    expect(reader.queries[0].limit).toBe(2);
    expect(result.processed).toBe(2);
    expect(store.records.size).toBe(2);
  });

  it('does not treat ALREADY_EXISTS as an error', async () => {
    const { useCase } = harness(undefined, {
      repository: () => ({
        saveIfAbsent: (): Promise<SaveValuationResult> =>
          Promise.resolve('ALREADY_EXISTS'),
      }),
    });

    const result = await useCase.execute({ companyId: 'company-1' });

    expect(result).toMatchObject({
      processed: 3,
      valued: 0,
      alreadyValued: 3,
      failures: [],
    });
  });

  it('counts reports without tariff or without prices and keeps going', async () => {
    const usdTariff: ValuationTariff = {
      id: 'tariff-2',
      price: { money: money('10', 'USD'), basis: 'POR_HECTAREA' },
      cost: { money: money('0', 'ARS'), basis: 'POR_HORA' },
    };
    const { store, useCase } = harness(
      [
        report({ id: 'report-1', laborTypeId: 'labor-1' }),
        report({ id: 'report-2', laborTypeId: 'labor-2' }),
        report({ id: 'report-3', laborTypeId: 'labor-3' }),
      ],
      {
        tariffs: {
          'company-1|labor-1': arsTariff,
          'company-1|labor-2': usdTariff,
        },
        market: new FakeMarketPrice(marketSnapshot({ usd: null })),
      },
    );

    const result = await useCase.execute({ companyId: 'company-1' });

    expect(result).toMatchObject({
      processed: 3,
      valued: 1,
      priceUnavailable: 1,
      withoutTariff: 1,
    });
    expect([...store.records.keys()]).toEqual(['report-1']);
  });

  it('reports an unexpected failure of one report without stopping the others', async () => {
    const boom = new Error('database down');
    const { store, useCase } = harness(undefined, {
      repository: (inner) => ({
        saveIfAbsent: (record: ValuationRecord) =>
          record.dailyReportId === 'report-2'
            ? Promise.reject(boom)
            : inner.saveIfAbsent(record),
      }),
    });

    const result = await useCase.execute({ companyId: 'company-1' });

    expect(result.valued).toBe(2);
    expect(result.failures).toEqual([{ reportId: 'report-2', error: boom }]);
    expect([...store.records.keys()]).toEqual(['report-1', 'report-3']);
  });

  it('two concurrent retries leave one valuation per report and neither fails', async () => {
    const { store, useCase } = harness([report({ id: 'report-1' })]);

    const [first, second] = await Promise.all([
      useCase.execute({ companyId: 'company-1', laborTypeId: 'labor-1' }),
      useCase.execute({ companyId: 'company-1', laborTypeId: 'labor-1' }),
    ]);

    expect(store.records.size).toBe(1);
    expect(store.attempts).toHaveLength(2);
    expect(first.failures).toEqual([]);
    expect(second.failures).toEqual([]);
    expect(first.valued + second.valued).toBe(1);
    expect(first.alreadyValued + second.alreadyValued).toBe(1);
  });
});
