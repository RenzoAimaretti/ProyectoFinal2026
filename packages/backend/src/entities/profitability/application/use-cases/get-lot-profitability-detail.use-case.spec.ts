import { Dec } from '../../../valuation/domain/decimal';
import { MarketUnavailableError } from '../../../valuation/domain/errors';
import { marketSnapshot } from '../../../valuation/application/valuation.test-fakes';
import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import {
  DetailExpense,
  DetailReport,
} from '../ports/profitability-reader.port';
import {
  ars,
  CompanyData,
  FakeMarketSnapshot,
  FixedClock,
  InMemoryProfitabilityReader,
  kg,
  lotInfo,
  pending,
  usd,
} from '../profitability.test-fakes';
import { GetLotProfitabilityDetailUseCase } from './get-lot-profitability-detail.use-case';

const TENANT = 'tenant-1';
const session = { companyId: 'company-1', tenantId: TENANT, lotId: 'lot-1' };

function report(
  overrides: Partial<DetailReport & { lotId: string }> = {},
): DetailReport & { lotId: string } {
  return {
    lotId: 'lot-1',
    reportId: 'report-1',
    date: '2026-03-10',
    laborName: 'Siembra',
    hectares: Dec.parse('50'),
    hours: Dec.parse('8'),
    price: {
      amount: Dec.parse('12'),
      unit: 'KG_CEREAL',
      grain: 'SOJA',
      basis: 'POR_HECTAREA',
    },
    cost: {
      amount: Dec.parse('960'),
      unit: 'ARS',
      grain: null,
      basis: 'POR_HORA',
    },
    income: kg('600', 'SOJA'),
    incomeAtApproval: Dec.parse('186000'),
    standardCost: ars('7680'),
    standardCostAtApproval: Dec.parse('7680'),
    ...overrides,
  };
}

function expenseRow(
  overrides: Partial<DetailExpense & { lotId: string }> = {},
): DetailExpense & { lotId: string } {
  return {
    lotId: 'lot-1',
    expenseId: 'expense-1',
    date: '2026-03-12',
    description: 'Gasoil',
    categoryId: 'cat-fuel',
    categoryName: 'Combustible',
    native: ars('30000'),
    arsAtApproval: Dec.parse('30000'),
    ...overrides,
  };
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

function build(
  data: Record<string, CompanyData>,
  market = new FakeMarketSnapshot(),
) {
  const reader = new InMemoryProfitabilityReader(data);
  const useCase = new GetLotProfitabilityDetailUseCase(
    reader,
    market,
    new FixedClock(),
  );
  return { useCase, reader, market };
}

describe('GetLotProfitabilityDetailUseCase', () => {
  it('shows each valued report with labor, date, quantity, applied tariff, income and standard cost', async () => {
    const { useCase } = build({
      'company-1': company({ reports: [report()] }),
    });

    const result = await useCase.execute({
      ...session,
      campaign: '2025/26',
    });

    expect(result.mode).toBe('AL_APROBAR');
    expect(result.range).toEqual({
      campaign: '2025/26',
      from: '2025-07-01',
      to: '2026-06-30',
    });
    expect(result.lot).toEqual({
      lotId: 'lot-1',
      lotName: 'Lote 1',
      farmName: 'La Esperanza',
      clientName: 'Cliente A',
      areaHa: '100.0000',
    });
    expect(result.reports).toEqual([
      {
        reportId: 'report-1',
        date: '2026-03-10',
        laborName: 'Siembra',
        quantity: '50.0000',
        hectares: '50.0000',
        hours: '8.0000',
        price: {
          amount: '12.0000',
          unit: 'KG_CEREAL',
          grain: 'SOJA',
          basis: 'POR_HECTAREA',
        },
        cost: {
          amount: '960.0000',
          unit: 'ARS',
          grain: null,
          basis: 'POR_HORA',
        },
        incomeNative: '600.0000',
        incomeArs: '186000.00',
        standardCostNative: '7680.0000',
        standardCostArs: '7680.00',
      },
    ]);
  });

  it('uses the hours as the quantity of an hourly price', async () => {
    const hourly = report({
      price: {
        amount: Dec.parse('100'),
        unit: 'ARS',
        grain: null,
        basis: 'POR_HORA',
      },
    });
    const { useCase } = build({ 'company-1': company({ reports: [hourly] }) });

    const result = await useCase.execute(session);

    expect(result.reports[0].quantity).toBe('8.0000');
  });

  it('groups the expenses by category with their subtotals', async () => {
    const { useCase } = build({
      'company-1': company({
        expenses: [
          expenseRow({ expenseId: 'e1', date: '2026-03-12' }),
          expenseRow({
            expenseId: 'e2',
            date: '2026-03-02',
            categoryId: 'cat-fuel',
            native: ars('5000'),
            arsAtApproval: Dec.parse('5000'),
          }),
          expenseRow({
            expenseId: 'e3',
            categoryId: 'cat-freight',
            categoryName: 'Flete',
            description: 'Camion',
            native: usd('100'),
            arsAtApproval: Dec.parse('153000'),
          }),
        ],
      }),
    });

    const result = await useCase.execute(session);

    expect(
      result.expensesByCategory.map((group) => [
        group.categoryName,
        group.subtotalArs,
        group.expenses.map((item) => item.expenseId),
      ]),
    ).toEqual([
      ['Combustible', '35000.00', ['e2', 'e1']],
      ['Flete', '153000.00', ['e3']],
    ]);
    expect(result.expensesByCategory[1].expenses[0]).toEqual({
      expenseId: 'e3',
      date: '2026-03-12',
      description: 'Camion',
      amount: '100.0000',
      unit: 'USD',
      grain: null,
      amountArs: '153000.00',
    });
  });

  it('summarizes the lot like the list does and lists the pending reports with their hectares', async () => {
    const { useCase } = build({
      'company-1': company({
        reports: [report()],
        expenses: [expenseRow()],
        pending: [pending('lot-1', 2, '40.5')],
      }),
    });

    const result = await useCase.execute(session);

    expect(result.summary).toEqual({
      areaHa: '100.0000',
      incomeArs: '186000.00',
      standardCostArs: '7680.00',
      expensesArs: '30000.00',
      costArs: '37680.00',
      marginArs: '148320.00',
      marginPerHaArs: '1483.20',
      profitability: '3.9363',
    });
    expect(result.pending).toEqual({ reports: 2, hectares: '40.5000' });
  });

  it('re-prices kilos and USD in A_VALOR_HOY and keeps the ARS components', async () => {
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
    const { useCase } = build(
      {
        'company-1': company({
          reports: [report()],
          expenses: [
            expenseRow({
              native: usd('100'),
              arsAtApproval: Dec.parse('153000'),
            }),
          ],
        }),
      },
      market,
    );

    const result = await useCase.execute({ ...session, mode: 'A_VALOR_HOY' });

    expect(result.mode).toBe('A_VALOR_HOY');
    expect(result.reports[0].incomeArs).toBe('198000.00');
    expect(result.reports[0].standardCostArs).toBe('7680.00');
    expect(result.expensesByCategory[0].subtotalArs).toBe('160000.00');
    expect(result.summary.incomeArs).toBe('198000.00');
    expect(market.needs).toHaveLength(1);
  });

  it('fails with MarketUnavailableError in A_VALOR_HOY when a price is missing, but not in AL_APROBAR', async () => {
    const market = new FakeMarketSnapshot(new MarketUnavailableError());
    const { useCase } = build(
      { 'company-1': company({ reports: [report()] }) },
      market,
    );

    await expect(
      useCase.execute({ ...session, mode: 'A_VALOR_HOY' }),
    ).rejects.toThrow(MarketUnavailableError);
    await expect(
      useCase.execute({ ...session, mode: 'AL_APROBAR' }),
    ).resolves.toMatchObject({ mode: 'AL_APROBAR' });
  });

  it('rejects an invalid campaign, range or mode before reading', async () => {
    const { useCase, reader } = build({ 'company-1': company() });

    await expect(
      useCase.execute({ ...session, campaign: '2025/28' }),
    ).rejects.toThrow(InvalidInputError);
    await expect(
      useCase.execute({ ...session, from: '2026-03-31', to: '2026-01-01' }),
    ).rejects.toThrow(InvalidInputError);
    await expect(useCase.execute({ ...session, mode: 'HOY' })).rejects.toThrow(
      InvalidInputError,
    );
    expect(reader.detailQueries).toEqual([]);
  });

  describe('firm isolation (R033)', () => {
    const data = {
      'company-1': company({
        lots: [lotInfo({ lotId: 'lot-1' })],
        reports: [report()],
      }),
      // Another firm of the SAME tenant works lot-2 and, even, lot-1.
      'company-2': company({
        lots: [lotInfo({ lotId: 'lot-2', lotName: 'Foreign lot' })],
        reports: [
          report({
            lotId: 'lot-2',
            reportId: 'foreign-report',
            laborName: 'Foreign labor',
          }),
          report({
            lotId: 'lot-1',
            reportId: 'foreign-on-lot-1',
            laborName: 'Foreign labor',
          }),
        ],
        expenses: [
          expenseRow({
            lotId: 'lot-1',
            expenseId: 'foreign-expense',
            description: 'Foreign expense',
          }),
        ],
        pending: [pending('lot-1', 9, '999')],
      }),
    };

    it('does not include the data of another firm on the same lot', async () => {
      const { useCase, reader } = build(data);

      const result = await useCase.execute(session);

      expect(result.reports.map((item) => item.reportId)).toEqual(['report-1']);
      expect(result.expensesByCategory).toEqual([]);
      expect(result.pending).toEqual({ reports: 0, hectares: '0.0000' });
      expect(reader.detailQueries[0]).toMatchObject({
        companyId: 'company-1',
        tenantId: TENANT,
        lotId: 'lot-1',
      });
      expect(JSON.stringify(result)).not.toContain('Foreign');
    });

    it('returns an empty detail for a lot without activity of the session firm', async () => {
      const { useCase } = build(data);

      const result = await useCase.execute({ ...session, lotId: 'lot-2' });

      expect(result.reports).toEqual([]);
      expect(result.expensesByCategory).toEqual([]);
      expect(result.pending).toEqual({ reports: 0, hectares: '0.0000' });
      expect(result.summary.incomeArs).toBe('0.00');
      expect(result.summary.profitability).toBeNull();
      expect(JSON.stringify(result.reports)).not.toContain('Foreign');
    });

    it('answers not found for a lot of another tenant', async () => {
      const { useCase } = build(data);

      await expect(
        useCase.execute({ ...session, tenantId: 'tenant-2' }),
      ).rejects.toThrow(EntityNotFoundError);
      await expect(
        useCase.execute({ ...session, lotId: 'missing' }),
      ).rejects.toThrow(EntityNotFoundError);
    });
  });
});
