import { Prisma } from '../../../../../prisma/generated/client';
import { PrismaTariffReader } from './prisma-tariff.reader';

const row = {
  id: 'tariff-1',
  companyId: 'company-1',
  laborTypeId: 'labor-1',
  priceAmount: new Prisma.Decimal('48'),
  priceUnit: 'KG_CEREAL',
  priceGrain: 'SOJA',
  priceBasis: 'POR_HECTAREA',
  costAmount: new Prisma.Decimal('8000.5'),
  costUnit: 'ARS',
  costGrain: null,
  costBasis: 'POR_HORA',
};

describe('PrismaTariffReader', () => {
  it('reads the tariff of the company and labor pair as exact decimals', async () => {
    const tariff = { findUnique: jest.fn().mockResolvedValue(row) };
    const reader = new PrismaTariffReader({ tariff } as never);

    const result = await reader.findByPair('company-1', 'labor-1');

    expect(tariff.findUnique).toHaveBeenCalledWith({
      where: {
        companyId_laborTypeId: {
          companyId: 'company-1',
          laborTypeId: 'labor-1',
        },
      },
    });
    expect(result?.id).toBe('tariff-1');
    expect(result?.price.basis).toBe('POR_HECTAREA');
    expect(result?.price.money.unit).toBe('KG_CEREAL');
    expect(result?.price.money.grain).toBe('SOJA');
    expect(result?.price.money.amount.toString()).toBe('48.0000');
    expect(result?.cost.money.amount.toString()).toBe('8000.5000');
    expect(result?.cost.money.grain).toBeNull();
  });

  it('returns null when the pair has no tariff', async () => {
    const tariff = { findUnique: jest.fn().mockResolvedValue(null) };
    const reader = new PrismaTariffReader({ tariff } as never);

    await expect(reader.findByPair('company-1', 'labor-9')).resolves.toBeNull();
  });
});
