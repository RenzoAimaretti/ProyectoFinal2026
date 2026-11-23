import { Dec } from '../../../valuation/domain/decimal';
import { MarketUnavailableError } from '../../../valuation/domain/errors';
import { marketSnapshot } from '../../../valuation/application/valuation.test-fakes';
import { InvalidInputError } from '../../domain/errors';
import {
  ars,
  CompanyData,
  expense,
  FakeMarketSnapshot,
  FixedClock,
  income,
  InMemoryProfitabilityReader,
  kg,
  lotInfo,
  pending,
  RecordingRetry,
  standardCost,
  usd,
} from '../profitability.test-fakes';
import { GetLotProfitabilityListUseCase } from './get-lot-profitability-list.use-case';

const TENANT = 'tenant-1';

function build(
  data: Record<string, CompanyData>,
  market = new FakeMarketSnapshot(),
) {
  const order: string[] = [];
  const reader = new InMemoryProfitabilityReader(data, order);
  const retry = new RecordingRetry(order);
  const useCase = new GetLotProfitabilityListUseCase(
    reader,
    retry,
    market,
    new FixedClock(),
  );
  return { useCase, reader, retry, market, order };
}

function company(overrides: Partial<CompanyData> = {}): CompanyData {
  return {
    tenantId: TENANT,
    lots: [lotInfo()],
    entries: [],
    pending: [],
    ...overrides,
  };
}

const session = { companyId: 'company-1', tenantId: TENANT };

describe('GetLotProfitabilityListUseCase', () => {
  describe('AL_APROBAR', () => {
    it('computes margin, margin per ha and profitability of the spec example (100 ha, 600000, 150000, 50000)', async () => {
      const { useCase } = build({
        'company-1': company({
          entries: [
            income(ars('600000'), '600000'),
            standardCost(ars('150000'), '150000'),
            expense(ars('50000'), '50000'),
          ],
        }),
      });

      const result = await useCase.execute({
        ...session,
        campaign: '2025/26',
        mode: 'AL_APROBAR',
      });

      expect(result.mode).toBe('AL_APROBAR');
      expect(result.range).toEqual({
        campaign: '2025/26',
        from: '2025-07-01',
        to: '2026-06-30',
      });
      expect(result.lots).toEqual([
        {
          lotId: 'lot-1',
          lotName: 'Lote 1',
          farmName: 'La Esperanza',
          clientName: 'Cliente A',
          areaHa: '100.0000',
          incomeArs: '600000.00',
          standardCostArs: '150000.00',
          expensesArs: '50000.00',
          costArs: '200000.00',
          marginArs: '400000.00',
          marginPerHaArs: '4000.00',
          profitability: '2.0000',
        },
      ]);
      expect(result.valuation).toEqual({ usdRateType: null, priceDate: null });
    });

    it('defaults to AL_APROBAR and to the current campaign', async () => {
      const { useCase, reader } = build({ 'company-1': company() });

      const result = await useCase.execute(session);

      expect(result.mode).toBe('AL_APROBAR');
      expect(result.range.campaign).toBe('2026/27');
      expect(reader.activityQueries[0].range).toEqual({
        from: '2026-07-01',
        to: '2027-06-30',
      });
    });

    it('queries only the range of a custom 2026-01-01..2026-03-31 filter', async () => {
      const { useCase, reader } = build({ 'company-1': company() });

      const result = await useCase.execute({
        ...session,
        from: '2026-01-01',
        to: '2026-03-31',
      });

      expect(result.range).toEqual({
        campaign: null,
        from: '2026-01-01',
        to: '2026-03-31',
      });
      expect(reader.activityQueries[0]).toEqual({
        companyId: 'company-1',
        tenantId: TENANT,
        range: { from: '2026-01-01', to: '2026-03-31' },
      });
    });

    it('presents profitability as null when the cost is 0 and computes the margin normally', async () => {
      const { useCase } = build({
        'company-1': company({ entries: [income(ars('1000'), '1000')] }),
      });

      const [row] = (await useCase.execute(session)).lots;

      expect(row.costArs).toBe('0.00');
      expect(row.marginArs).toBe('1000.00');
      expect(row.profitability).toBeNull();
    });

    it('shows cost without income as a negative margin', async () => {
      const { useCase } = build({
        'company-1': company({
          entries: [standardCost(ars('8000'), '8000')],
        }),
      });

      const [row] = (await useCase.execute(session)).lots;

      expect(row.incomeArs).toBe('0.00');
      expect(row.marginArs).toBe('-8000.00');
      expect(row.marginPerHaArs).toBe('-80.00');
      expect(row.profitability).toBe('-1.0000');
    });

    it('has no margin per hectare for a lot with no area', async () => {
      const { useCase } = build({
        'company-1': company({
          lots: [lotInfo({ areaHa: Dec.parse('0') })],
          entries: [income(ars('1000'), '1000')],
        }),
      });

      const [row] = (await useCase.execute(session)).lots;

      expect(row.marginPerHaArs).toBeNull();
    });

    it('computes the totals row over the sums, not by averaging rows', async () => {
      const { useCase } = build({
        'company-1': company({
          lots: [
            lotInfo({ lotId: 'lot-1', lotName: 'A', areaHa: Dec.parse('100') }),
            lotInfo({ lotId: 'lot-2', lotName: 'B', areaHa: Dec.parse('300') }),
          ],
          entries: [
            income(ars('600000'), '600000', 'lot-1'),
            standardCost(ars('200000'), '200000', 'lot-1'),
            standardCost(ars('100000'), '100000', 'lot-2'),
          ],
        }),
      });

      const { totals } = await useCase.execute(session);

      expect(totals).toEqual({
        areaHa: '400.0000',
        incomeArs: '600000.00',
        costArs: '300000.00',
        marginArs: '300000.00',
        marginPerHaArs: '750.00',
        profitability: '1.0000',
      });
    });

    it('lists only lots with valued reports, expenses or pending reports (D27)', async () => {
      const { useCase } = build({
        'company-1': company({
          lots: [
            lotInfo({ lotId: 'with-income', lotName: 'B' }),
            lotInfo({ lotId: 'with-expense', lotName: 'C' }),
            lotInfo({ lotId: 'only-pending', lotName: 'D' }),
            lotInfo({ lotId: 'idle', lotName: 'A' }),
          ],
          entries: [
            income(ars('10'), '10', 'with-income'),
            expense(ars('5'), '5', 'with-expense'),
          ],
          pending: [pending('only-pending', 2, '30')],
        }),
      });

      const result = await useCase.execute(session);

      expect(result.lots.map((row) => row.lotId)).toEqual([
        'with-income',
        'with-expense',
        'only-pending',
      ]);
      // The idle lot adds nothing to the totals.
      expect(result.totals.areaHa).toBe('300.0000');
    });

    it('retries the pending valuations of the company before reading', async () => {
      const { useCase, retry, order } = build({ 'company-1': company() });

      await useCase.execute(session);

      expect(retry.calls).toEqual(['company-1']);
      expect(order).toEqual(['retry', 'read']);
    });

    it('reports how many reports and hectares are still unvalued', async () => {
      const { useCase } = build({
        'company-1': company({
          lots: [lotInfo({ lotId: 'a' }), lotInfo({ lotId: 'b' })],
          pending: [pending('a', 2, '50.5'), pending('b', 1, '69.5')],
        }),
      });

      const result = await useCase.execute(session);

      expect(result.pending).toEqual({ reports: 3, hectares: '120.0000' });
    });

    it('does not ask the market, so a market outage does not affect it', async () => {
      const market = new FakeMarketSnapshot(new MarketUnavailableError());
      const { useCase } = build(
        {
          'company-1': company({
            entries: [income(kg('600', 'SOJA'), '186000')],
          }),
        },
        market,
      );

      const result = await useCase.execute({
        ...session,
        mode: 'AL_APROBAR',
      });

      expect(result.lots[0].incomeArs).toBe('186000.00');
      expect(market.needs).toEqual([]);
    });

    it.each([
      [{ campaign: '2025/28' }],
      [{ from: '2026-03-31', to: '2026-01-01' }],
      [{ mode: 'HOY' }],
    ])('rejects the invalid filter %j', async (filter) => {
      const { useCase, reader, retry } = build({ 'company-1': company() });

      await expect(useCase.execute({ ...session, ...filter })).rejects.toThrow(
        InvalidInputError,
      );
      expect(reader.activityQueries).toEqual([]);
      expect(retry.calls).toEqual([]);
    });
  });

  describe('A_VALOR_HOY', () => {
    const entries = [
      // 600 kg of soy agreed at approval: 310000 ARS/t -> 186000.
      income(kg('600', 'SOJA'), '186000'),
      // ARS components: unchanged by the revaluation.
      standardCost(ars('48000'), '48000'),
      // 1000 USD loaded at 1530.
      expense(usd('1000'), '1530000'),
    ];

    it("re-prices kilos and USD with today's market and keeps ARS amounts", async () => {
      const market = new FakeMarketSnapshot(
        marketSnapshot({
          grainArsPerTon: { SOJA: Dec.parse('330000') },
          usd: {
            oficialVenta: Dec.parse('1600'),
            oficialCompra: Dec.parse('1500'),
            bnaPizarra: null,
          },
        }),
      );
      const { useCase } = build({ 'company-1': company({ entries }) }, market);

      const snapshotMode = (
        await useCase.execute({ ...session, mode: 'AL_APROBAR' })
      ).lots[0];
      const todayMode = (
        await useCase.execute({ ...session, mode: 'A_VALOR_HOY' })
      ).lots[0];

      // 600 kg x 330000 / 1000 = 198000 (vs 186000 at approval).
      expect(snapshotMode.incomeArs).toBe('186000.00');
      expect(todayMode.incomeArs).toBe('198000.00');
      // The ARS-agreed standard cost is equal in both modes.
      expect(snapshotMode.standardCostArs).toBe('48000.00');
      expect(todayMode.standardCostArs).toBe('48000.00');
      // 1000 USD x 1600 (vs 1530000 at load).
      expect(snapshotMode.expensesArs).toBe('1530000.00');
      expect(todayMode.expensesArs).toBe('1600000.00');
      expect(todayMode.costArs).toBe('1648000.00');
    });

    it('asks ONE market photo with only the grains and USD it needs', async () => {
      const market = new FakeMarketSnapshot();
      const { useCase } = build(
        {
          'company-1': company({
            entries: [
              income(kg('600', 'SOJA'), '1'),
              income(kg('100', 'MAIZ'), '1'),
              income(kg('50', 'SOJA'), '1'),
              expense(usd('10'), '1'),
              expense(usd('20'), '1'),
            ],
          }),
        },
        market,
      );

      // MAIZ has no price in the default photo: only the request is checked.
      await useCase
        .execute({ ...session, mode: 'A_VALOR_HOY' })
        .catch(() => undefined);

      expect(market.needs).toHaveLength(1);
      expect([...market.needs[0].grains].sort()).toEqual(['MAIZ', 'SOJA']);
      expect(market.needs[0].usd).toBe(true);
    });

    it('does not ask the market when every amount is in ARS', async () => {
      const market = new FakeMarketSnapshot(new MarketUnavailableError());
      const { useCase } = build(
        {
          'company-1': company({
            entries: [income(ars('1000'), '1000')],
          }),
        },
        market,
      );

      const result = await useCase.execute({
        ...session,
        mode: 'A_VALOR_HOY',
      });

      expect(result.lots[0].incomeArs).toBe('1000.00');
      expect(market.needs).toEqual([]);
    });

    it('uses the CURRENT rate policy for USD, not the one the snapshot used (D28)', async () => {
      // The snapshot was 1000 USD at 1530 (OFICIAL_VENTA); today's sale rate is 1500.
      const market = new FakeMarketSnapshot(
        marketSnapshot({
          usd: {
            oficialVenta: Dec.parse('1500'),
            oficialCompra: Dec.parse('1400'),
            bnaPizarra: null,
          },
        }),
      );
      const { useCase } = build(
        {
          'company-1': company({
            entries: [expense(usd('1000'), '1530000')],
          }),
        },
        market,
      );

      const result = await useCase.execute({
        ...session,
        mode: 'A_VALOR_HOY',
      });

      expect(result.lots[0].expensesArs).toBe('1500000.00');
      expect(result.valuation.usdRateType).toBe('OFICIAL_VENTA');
    });

    it('reports the oldest price date used', async () => {
      const market = new FakeMarketSnapshot(
        marketSnapshot({
          fetchedAt: {
            grains: new Date('2026-11-23T10:00:00Z'),
            usd: new Date('2026-11-23T11:00:00Z'),
          },
        }),
      );
      const { useCase } = build({ 'company-1': company({ entries }) }, market);

      const result = await useCase.execute({
        ...session,
        mode: 'A_VALOR_HOY',
      });

      expect(result.valuation.priceDate).toBe('2026-11-23T10:00:00.000Z');
    });

    it('fails with MarketUnavailableError when a required price is missing, never mixing values', async () => {
      const market = new FakeMarketSnapshot(
        marketSnapshot({ grainArsPerTon: { SOJA: null } }),
      );
      const { useCase } = build({ 'company-1': company({ entries }) }, market);

      await expect(
        useCase.execute({ ...session, mode: 'A_VALOR_HOY' }),
      ).rejects.toThrow(MarketUnavailableError);
    });

    it('propagates the error when the whole market is unreachable', async () => {
      const market = new FakeMarketSnapshot(new MarketUnavailableError());
      const { useCase } = build({ 'company-1': company({ entries }) }, market);

      await expect(
        useCase.execute({ ...session, mode: 'A_VALOR_HOY' }),
      ).rejects.toThrow(MarketUnavailableError);
    });
  });

  describe('firm isolation (R033)', () => {
    const data = {
      'company-1': company({
        lots: [lotInfo({ lotId: 'lot-a', lotName: 'Own' })],
        entries: [income(ars('100'), '100', 'lot-a')],
        pending: [pending('lot-a', 1, '10')],
      }),
      'company-2': company({
        lots: [lotInfo({ lotId: 'lot-b', lotName: 'Foreign' })],
        entries: [income(ars('999999'), '999999', 'lot-b')],
        pending: [pending('lot-b', 7, '777')],
      }),
    };

    it('shows only the data of the session company', async () => {
      const { useCase, reader, retry } = build(data);

      const result = await useCase.execute(session);

      expect(result.lots.map((row) => row.lotId)).toEqual(['lot-a']);
      expect(result.totals.incomeArs).toBe('100.00');
      expect(result.pending).toEqual({ reports: 1, hectares: '10.0000' });
      expect(reader.activityQueries.map((q) => q.companyId)).toEqual([
        'company-1',
      ]);
      expect(retry.calls).toEqual(['company-1']);
      expect(JSON.stringify(result)).not.toContain('Foreign');
    });

    it('gives the other company its own data and nothing of the first', async () => {
      const { useCase } = build(data);

      const result = await useCase.execute({
        companyId: 'company-2',
        tenantId: TENANT,
      });

      expect(result.lots.map((row) => row.lotId)).toEqual(['lot-b']);
      expect(result.totals.incomeArs).toBe('999999.00');
    });

    it('shows nothing for a company of another tenant', async () => {
      const { useCase } = build(data);

      const result = await useCase.execute({
        companyId: 'company-1',
        tenantId: 'tenant-2',
      });

      expect(result.lots).toEqual([]);
    });
  });
});
