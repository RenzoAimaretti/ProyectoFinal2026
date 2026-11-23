import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Dec } from '../../domain/decimal';
import { ValuationRecord } from '../../application/ports/valuation-repository.port';
import { PrismaValuationRepository } from './prisma-valuation.repository';

const record: ValuationRecord = {
  dailyReportId: 'report-1',
  companyId: 'company-1',
  lotId: 'lot-1',
  origin: 'REINTENTO',
  valuedAt: new Date('2026-11-23T12:00:00Z'),
  tariff: {
    id: 'tariff-1',
    price: {
      money: { amount: Dec.parse('48'), unit: 'KG_CEREAL', grain: 'SOJA' },
      basis: 'POR_HECTAREA',
    },
    cost: {
      money: { amount: Dec.parse('8000'), unit: 'ARS', grain: null },
      basis: 'POR_HORA',
    },
  },
  computation: {
    hectares: Dec.parse('12.5000'),
    hours: Dec.parse('6.0000'),
    incomeNative: Dec.parse('600.0000'),
    costNative: Dec.parse('48000.0000'),
    incomeArs: Dec.parse('186000.00'),
    costArs: Dec.parse('48000.00'),
    incomeGrainArsPerTon: Dec.parse('310000'),
    costGrainArsPerTon: null,
    usdRate: null,
    usdRateType: null,
    grainSource: 'cac.bcr.com.ar',
    usdSource: null,
    priceFetchedAt: new Date('2026-11-23T11:55:00Z'),
    priceStale: true,
  },
};

function build() {
  const dailyReportValuation = { create: jest.fn().mockResolvedValue({}) };
  return {
    dailyReportValuation,
    repository: new PrismaValuationRepository({
      dailyReportValuation,
    } as never),
  };
}

const conflict = (meta?: Record<string, unknown>) =>
  new PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '7.8.0',
    ...(meta ? { meta } : {}),
  });

describe('PrismaValuationRepository', () => {
  it('inserts the whole snapshot as decimal strings and reports CREATED', async () => {
    const { repository, dailyReportValuation } = build();

    await expect(repository.saveIfAbsent(record)).resolves.toBe('CREATED');

    expect(dailyReportValuation.create).toHaveBeenCalledWith({
      data: {
        dailyReportId: 'report-1',
        companyId: 'company-1',
        lotId: 'lot-1',
        tariffId: 'tariff-1',
        origin: 'REINTENTO',
        priceAmount: '48',
        priceUnit: 'KG_CEREAL',
        priceGrain: 'SOJA',
        priceBasis: 'POR_HECTAREA',
        costAmount: '8000',
        costUnit: 'ARS',
        costGrain: null,
        costBasis: 'POR_HORA',
        hectares: '12.5000',
        hours: '6.0000',
        incomeNative: '600.0000',
        costNative: '48000.0000',
        incomeGrainArsPerTon: '310000',
        costGrainArsPerTon: null,
        usdRate: null,
        usdRateType: null,
        grainSource: 'cac.bcr.com.ar',
        usdSource: null,
        priceFetchedAt: new Date('2026-11-23T11:55:00Z'),
        priceStale: true,
        incomeArs: '186000.00',
        costArs: '48000.00',
        valuedAt: new Date('2026-11-23T12:00:00Z'),
      },
    });
  });

  it.each([
    ['a target list', { target: ['dailyReportId'] }],
    ['a target string', { target: 'DailyReportValuation_dailyReportId_key' }],
    [
      'a driver adapter constraint',
      {
        driverAdapterError: {
          cause: {
            kind: 'UniqueConstraintViolation',
            constraint: { fields: ['dailyReportId'] },
          },
        },
      },
    ],
    [
      'a quoted driver adapter constraint field',
      {
        driverAdapterError: {
          cause: {
            kind: 'UniqueConstraintViolation',
            constraint: { fields: ['"dailyReportId"'] },
          },
        },
      },
    ],
    ['no metadata', undefined],
  ])(
    'translates a P2002 on dailyReportId (%s) to ALREADY_EXISTS instead of failing',
    async (_label, meta) => {
      const { repository, dailyReportValuation } = build();
      dailyReportValuation.create.mockRejectedValue(conflict(meta));

      await expect(repository.saveIfAbsent(record)).resolves.toBe(
        'ALREADY_EXISTS',
      );
    },
  );

  it('keeps propagating a P2002 on another column', async () => {
    const { repository, dailyReportValuation } = build();
    const error = conflict({ target: ['id'] });
    dailyReportValuation.create.mockRejectedValue(error);

    await expect(repository.saveIfAbsent(record)).rejects.toBe(error);
  });

  it('keeps propagating a P2002 whose quoted driver adapter field is another column', async () => {
    const { repository, dailyReportValuation } = build();
    const error = conflict({
      driverAdapterError: {
        cause: {
          kind: 'UniqueConstraintViolation',
          constraint: { fields: ['"id"'] },
        },
      },
    });
    dailyReportValuation.create.mockRejectedValue(error);

    await expect(repository.saveIfAbsent(record)).rejects.toBe(error);
  });

  it('keeps propagating any other Prisma or unexpected error', async () => {
    const { repository, dailyReportValuation } = build();
    const foreignKey = new PrismaClientKnownRequestError('FK failed', {
      code: 'P2003',
      clientVersion: '7.8.0',
    });
    dailyReportValuation.create.mockRejectedValueOnce(foreignKey);
    await expect(repository.saveIfAbsent(record)).rejects.toBe(foreignKey);

    const down = new Error('connection lost');
    dailyReportValuation.create.mockRejectedValueOnce(down);
    await expect(repository.saveIfAbsent(record)).rejects.toBe(down);
  });
});
