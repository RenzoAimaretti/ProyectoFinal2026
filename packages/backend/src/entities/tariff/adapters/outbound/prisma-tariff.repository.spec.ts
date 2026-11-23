import { Prisma } from '../../../../../prisma/generated/client';
import { parseTariffValues } from '../../domain/tariff.rules';
import { PrismaTariffRepository } from './prisma-tariff.repository';

const row = {
  id: 'tariff-1',
  companyId: 'company-1',
  laborTypeId: 'labor-1',
  priceAmount: new Prisma.Decimal('12'),
  priceUnit: 'KG_CEREAL',
  priceGrain: 'SOJA',
  priceBasis: 'POR_HECTAREA',
  costAmount: new Prisma.Decimal('8000.5'),
  costUnit: 'ARS',
  costGrain: null,
  costBasis: 'POR_HORA',
  updatedBy: 'admin-1',
  createdAt: new Date('2026-11-23T10:00:00Z'),
  updatedAt: new Date('2026-11-23T11:00:00Z'),
};

function build() {
  const tariff = {
    findMany: jest.fn().mockResolvedValue([row]),
    upsert: jest.fn().mockResolvedValue(row),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  return {
    tariff,
    repository: new PrismaTariffRepository({ tariff } as never),
  };
}

const values = parseTariffValues({
  price: {
    amount: '12',
    unit: 'KG_CEREAL',
    grain: 'SOJA',
    basis: 'POR_HECTAREA',
  },
  cost: { amount: '8000.5', unit: 'ARS', basis: 'POR_HORA' },
});

describe('PrismaTariffRepository', () => {
  it('maps Decimal columns to decimal strings and keeps unit, grain and basis', async () => {
    const { repository, tariff } = build();

    const result = await repository.findAllByCompany('company-1');

    expect(tariff.findMany).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual([
      {
        id: 'tariff-1',
        laborTypeId: 'labor-1',
        price: {
          amount: '12.0000',
          unit: 'KG_CEREAL',
          grain: 'SOJA',
          basis: 'POR_HECTAREA',
        },
        cost: {
          amount: '8000.5000',
          unit: 'ARS',
          grain: null,
          basis: 'POR_HORA',
        },
        updatedBy: 'admin-1',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    ]);
  });

  it('upserts on the company + labor type pair with amounts as exact strings', async () => {
    const { repository, tariff } = build();

    await repository.upsert({
      companyId: 'company-1',
      laborTypeId: 'labor-1',
      userId: 'admin-1',
      values,
    });

    const data = {
      priceAmount: '12',
      priceUnit: 'KG_CEREAL',
      priceGrain: 'SOJA',
      priceBasis: 'POR_HECTAREA',
      costAmount: '8000.5',
      costUnit: 'ARS',
      costGrain: null,
      costBasis: 'POR_HORA',
      updatedBy: 'admin-1',
    };
    expect(tariff.upsert).toHaveBeenCalledWith({
      where: {
        companyId_laborTypeId: {
          companyId: 'company-1',
          laborTypeId: 'labor-1',
        },
      },
      create: { companyId: 'company-1', laborTypeId: 'labor-1', ...data },
      update: data,
    });
  });

  it('deletes by the pair and reports whether something was deleted', async () => {
    const { repository, tariff } = build();

    await expect(repository.deleteByPair('company-1', 'labor-1')).resolves.toBe(
      true,
    );
    expect(tariff.deleteMany).toHaveBeenCalledWith({
      where: { companyId: 'company-1', laborTypeId: 'labor-1' },
    });

    tariff.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(repository.deleteByPair('company-1', 'labor-9')).resolves.toBe(
      false,
    );
  });
});
