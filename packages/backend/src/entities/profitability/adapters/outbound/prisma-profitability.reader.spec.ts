import { Prisma } from '../../../../../prisma/generated/client';
import { PrismaProfitabilityReader } from './prisma-profitability.reader';

const D = (value: string) => new Prisma.Decimal(value);

const range = { from: '2026-01-01', to: '2026-03-31' };
const REPORT_BOUNDS = {
  gte: new Date('2026-01-01T03:00:00.000Z'),
  lt: new Date('2026-04-01T03:00:00.000Z'),
};
const EXPENSE_BOUNDS = {
  gte: new Date('2026-01-01T00:00:00.000Z'),
  lt: new Date('2026-04-01T00:00:00.000Z'),
};

const lotRow = {
  id: 'lot-1',
  name: 'Lote 1',
  area: 100,
  farm: { name: 'La Esperanza', client: { name: 'Cliente A' } },
};

const valuationRow = {
  lotId: 'lot-1',
  priceUnit: 'KG_CEREAL',
  priceGrain: 'SOJA',
  incomeNative: D('600'),
  incomeArs: D('186000'),
  costUnit: 'ARS',
  costGrain: null,
  costNative: D('48000'),
  costArs: D('48000'),
};

const expenseRow = {
  lotId: 'lot-1',
  unit: 'USD',
  grain: null,
  amount: D('1000'),
  amountArs: D('1530000'),
};

function build() {
  const prisma = {
    dailyReportValuation: {
      findMany: jest.fn().mockResolvedValue([valuationRow]),
    },
    expense: { findMany: jest.fn().mockResolvedValue([expenseRow]) },
    dailyReport: {
      groupBy: jest
        .fn()
        .mockResolvedValue([
          { lotId: 'lot-1', _count: { _all: 2 }, _sum: { hectares: 40.5 } },
        ]),
      aggregate: jest.fn().mockResolvedValue({
        _count: { _all: 2 },
        _sum: { hectares: 40.5 },
      }),
    },
    lot: {
      findMany: jest.fn().mockResolvedValue([lotRow]),
      findFirst: jest.fn().mockResolvedValue(lotRow),
    },
  };
  return { prisma, reader: new PrismaProfitabilityReader(prisma as never) };
}

const query = { companyId: 'company-1', tenantId: 'tenant-1', range };

describe('PrismaProfitabilityReader.findActivity', () => {
  it('reads valued reports of the session company with the Argentine date bounds', async () => {
    const { reader, prisma } = build();

    await reader.findActivity(query);

    expect(prisma.dailyReportValuation.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        dailyReport: { date: REPORT_BOUNDS },
      },
      select: expect.any(Object) as unknown,
    });
  });

  it('reads expenses of the session company, excluding deleted ones, with whole-UTC-day bounds', async () => {
    const { reader, prisma } = build();

    await reader.findActivity(query);

    expect(prisma.expense.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        deletedAt: null,
        date: EXPENSE_BOUNDS,
      },
      select: expect.any(Object) as unknown,
    });
  });

  it('includes an expense dated on the last day of the range and excludes the day after', () => {
    const lastDay = new Date('2026-03-31T00:00:00.000Z');
    const dayAfter = new Date('2026-04-01T00:00:00.000Z');

    expect(lastDay >= EXPENSE_BOUNDS.gte && lastDay < EXPENSE_BOUNDS.lt).toBe(
      true,
    );
    expect(dayAfter < EXPENSE_BOUNDS.lt).toBe(false);
  });

  it('reads the unvalued approved reports of the company and range, per lot', async () => {
    const { reader, prisma } = build();

    const result = await reader.findActivity(query);

    expect(prisma.dailyReport.groupBy).toHaveBeenCalledWith({
      by: ['lotId'],
      where: {
        companyId: 'company-1',
        status: 'APROBADO',
        valuation: { is: null },
        date: REPORT_BOUNDS,
      },
      _count: { _all: true },
      _sum: { hectares: true },
    });
    expect(result.pending).toHaveLength(1);
    expect(result.pending[0]).toMatchObject({ lotId: 'lot-1', reports: 2 });
    expect(result.pending[0].hectares.toString()).toBe('40.5000');
  });

  it('looks lots up only inside the tenant (lot -> farm -> client)', async () => {
    const { reader, prisma } = build();

    await reader.findActivity(query);

    expect(prisma.lot.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['lot-1'] },
        farm: { client: { tenantId: 'tenant-1' } },
      },
      select: expect.any(Object) as unknown,
    });
  });

  it('maps income, standard cost and expenses to native amounts plus the ARS at approval', async () => {
    const { reader } = build();

    const result = await reader.findActivity(query);

    expect(
      result.entries.map((e) => [
        e.lotId,
        e.kind,
        e.native.unit,
        e.native.grain,
        e.native.amount.toString(),
        e.arsAtApproval.toString(),
      ]),
    ).toEqual([
      ['lot-1', 'INCOME', 'KG_CEREAL', 'SOJA', '600.0000', '186000.0000'],
      ['lot-1', 'STANDARD_COST', 'ARS', null, '48000.0000', '48000.0000'],
      ['lot-1', 'EXPENSE', 'USD', null, '1000.0000', '1530000.0000'],
    ]);
    expect(result.lots).toEqual([
      {
        lotId: 'lot-1',
        lotName: 'Lote 1',
        farmName: 'La Esperanza',
        clientName: 'Cliente A',
        areaHa: expect.anything() as unknown,
      },
    ]);
    expect(result.lots[0].areaHa.toString()).toBe('100.0000');
  });

  it('every query that reads company data filters by the session company', async () => {
    const { reader, prisma } = build();

    await reader.findActivity({ ...query, companyId: 'company-9' });

    for (const mock of [
      prisma.dailyReportValuation.findMany,
      prisma.expense.findMany,
      prisma.dailyReport.groupBy,
    ]) {
      expect(
        (
          (mock.mock.calls as unknown[][])[0][0] as {
            where: { companyId: string };
          }
        ).where.companyId,
      ).toBe('company-9');
    }
  });

  it('does not query lots when there is no activity', async () => {
    const { reader, prisma } = build();
    prisma.dailyReportValuation.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([]);
    prisma.dailyReport.groupBy.mockResolvedValue([]);

    const result = await reader.findActivity(query);

    expect(result).toEqual({ lots: [], entries: [], pending: [] });
    expect(prisma.lot.findMany).not.toHaveBeenCalled();
  });
});

describe('PrismaProfitabilityReader.findLotDetail', () => {
  const detailQuery = { ...query, lotId: 'lot-1' };

  function withDetailRows(prisma: ReturnType<typeof build>['prisma']) {
    prisma.dailyReportValuation.findMany.mockResolvedValue([
      {
        dailyReportId: 'report-1',
        hectares: D('50'),
        hours: D('8'),
        priceAmount: D('12'),
        priceUnit: 'KG_CEREAL',
        priceGrain: 'SOJA',
        priceBasis: 'POR_HECTAREA',
        costAmount: D('960'),
        costUnit: 'ARS',
        costGrain: null,
        costBasis: 'POR_HORA',
        incomeNative: D('600'),
        incomeArs: D('186000'),
        costNative: D('7680'),
        costArs: D('7680'),
        // 2026-03-11 01:00Z is the evening of the 10th in Argentina.
        dailyReport: {
          date: new Date('2026-03-11T01:00:00Z'),
          laborType: { name: 'Siembra' },
        },
      },
    ]);
    prisma.expense.findMany.mockResolvedValue([
      {
        id: 'expense-1',
        date: new Date('2026-03-12T00:00:00Z'),
        description: 'Gasoil',
        categoryId: 'cat-fuel',
        category: { name: 'Combustible' },
        unit: 'ARS',
        grain: null,
        amount: D('30000'),
        amountArs: D('30000'),
      },
    ]);
  }

  it('is null when the lot is not in the tenant, without reading company data', async () => {
    const { reader, prisma } = build();
    prisma.lot.findFirst.mockResolvedValue(null);

    await expect(reader.findLotDetail(detailQuery)).resolves.toBeNull();

    expect(prisma.lot.findFirst).toHaveBeenCalledWith({
      where: { id: 'lot-1', farm: { client: { tenantId: 'tenant-1' } } },
      select: expect.any(Object) as unknown,
    });
    expect(prisma.dailyReportValuation.findMany).not.toHaveBeenCalled();
    expect(prisma.expense.findMany).not.toHaveBeenCalled();
  });

  it('limits reports, expenses and pending to the session company, the lot and the range', async () => {
    const { reader, prisma } = build();
    withDetailRows(prisma);

    await reader.findLotDetail(detailQuery);

    expect(prisma.dailyReportValuation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-1',
          lotId: 'lot-1',
          dailyReport: { date: REPORT_BOUNDS },
        },
      }),
    );
    expect(prisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-1',
          lotId: 'lot-1',
          deletedAt: null,
          date: EXPENSE_BOUNDS,
        },
      }),
    );
    expect(prisma.dailyReport.aggregate).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        lotId: 'lot-1',
        status: 'APROBADO',
        valuation: { is: null },
        date: REPORT_BOUNDS,
      },
      _count: { _all: true },
      _sum: { hectares: true },
    });
  });

  it('maps the valued reports (Argentine day, applied tariff) and the expenses', async () => {
    const { reader, prisma } = build();
    withDetailRows(prisma);

    const detail = await reader.findLotDetail(detailQuery);

    expect(detail?.lot.lotName).toBe('Lote 1');
    expect(detail?.reports).toHaveLength(1);
    const [report] = detail?.reports ?? [];
    expect(report).toMatchObject({
      reportId: 'report-1',
      date: '2026-03-10',
      laborName: 'Siembra',
    });
    expect(report.hectares.toString()).toBe('50.0000');
    expect(report.price).toMatchObject({
      unit: 'KG_CEREAL',
      grain: 'SOJA',
      basis: 'POR_HECTAREA',
    });
    expect(report.price.amount.toString()).toBe('12.0000');
    expect(report.income.unit).toBe('KG_CEREAL');
    expect(report.income.amount.toString()).toBe('600.0000');
    expect(report.incomeAtApproval.toString()).toBe('186000.0000');
    expect(report.standardCostAtApproval.toString()).toBe('7680.0000');

    expect(detail?.expenses).toHaveLength(1);
    const [expense] = detail?.expenses ?? [];
    expect(expense).toMatchObject({
      expenseId: 'expense-1',
      date: '2026-03-12',
      description: 'Gasoil',
      categoryId: 'cat-fuel',
      categoryName: 'Combustible',
    });
    expect(expense.arsAtApproval.toString()).toBe('30000.0000');
    expect(detail?.pending.reports).toBe(2);
    expect(detail?.pending.hectares.toString()).toBe('40.5000');
  });

  it('has zero pending hectares when nothing is pending', async () => {
    const { reader, prisma } = build();
    prisma.dailyReportValuation.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([]);
    prisma.dailyReport.aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _sum: { hectares: null },
    });

    const detail = await reader.findLotDetail(detailQuery);

    expect(detail?.pending.reports).toBe(0);
    expect(detail?.pending.hectares.toString()).toBe('0.0000');
  });
});
