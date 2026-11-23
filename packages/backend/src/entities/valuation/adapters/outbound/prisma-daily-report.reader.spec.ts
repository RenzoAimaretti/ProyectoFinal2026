import { PrismaDailyReportReader } from './prisma-daily-report.reader';

const row = {
  id: 'report-1',
  companyId: 'company-1',
  lotId: 'lot-1',
  laborTypeId: 'labor-1',
  hectares: 12.5,
  hours: 0.1,
};

const SELECT = {
  id: true,
  companyId: true,
  lotId: true,
  laborTypeId: true,
  hectares: true,
  hours: true,
};

function build() {
  const dailyReport = {
    findFirst: jest.fn().mockResolvedValue(row),
    findMany: jest.fn().mockResolvedValue([row]),
    aggregate: jest.fn(),
  };
  return {
    dailyReport,
    reader: new PrismaDailyReportReader({ dailyReport } as never),
  };
}

describe('PrismaDailyReportReader', () => {
  it('reads an approved report of the company and converts the Float columns exactly', async () => {
    const { reader, dailyReport } = build();

    const result = await reader.findApprovedById('company-1', 'report-1');

    expect(dailyReport.findFirst).toHaveBeenCalledWith({
      where: { id: 'report-1', companyId: 'company-1', status: 'APROBADO' },
      select: SELECT,
    });
    expect(result?.hectares.toString()).toBe('12.5000');
    expect(result?.hours.toString()).toBe('0.1000');
    expect(result).toMatchObject({
      id: 'report-1',
      companyId: 'company-1',
      lotId: 'lot-1',
      laborTypeId: 'labor-1',
    });
  });

  it('returns null when the report is missing, from another company or not approved', async () => {
    const { reader, dailyReport } = build();
    dailyReport.findFirst.mockResolvedValue(null);

    await expect(
      reader.findApprovedById('company-1', 'report-1'),
    ).resolves.toBeNull();
  });

  it('lists approved reports without valuation of one labor type, oldest first, capped by limit', async () => {
    const { reader, dailyReport } = build();

    const result = await reader.findApprovedWithoutValuation({
      companyId: 'company-1',
      laborTypeId: 'labor-1',
      limit: 200,
    });

    expect(dailyReport.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        status: 'APROBADO',
        laborTypeId: 'labor-1',
        valuation: { is: null },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      take: 200,
      select: SELECT,
    });
    expect(result).toHaveLength(1);
    expect(result[0].hours.toString()).toBe('0.1000');
  });

  it('does not filter by labor type when none is given', async () => {
    const { reader, dailyReport } = build();

    await reader.findApprovedWithoutValuation({
      companyId: 'company-1',
      limit: 5,
    });

    expect(dailyReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-1',
          status: 'APROBADO',
          valuation: { is: null },
        },
        take: 5,
      }),
    );
  });

  it('summarizes every pending report (count and hectares) without a limit', async () => {
    const { reader, dailyReport } = build();
    dailyReport.aggregate.mockResolvedValue({
      _count: { _all: 3 },
      _sum: { hectares: 37.5 },
    });

    const summary = await reader.summarizePendingValuation('company-1');

    expect(dailyReport.aggregate).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        status: 'APROBADO',
        valuation: { is: null },
      },
      _count: { _all: true },
      _sum: { hectares: true },
    });
    expect(summary.count).toBe(3);
    expect(summary.hectares.toString()).toBe('37.5000');
  });

  it('summarizes zero pending reports as 0 hectares', async () => {
    const { reader, dailyReport } = build();
    dailyReport.aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _sum: { hectares: null },
    });

    const summary = await reader.summarizePendingValuation('company-1');

    expect(summary.count).toBe(0);
    expect(summary.hectares.toString()).toBe('0.0000');
  });
});
