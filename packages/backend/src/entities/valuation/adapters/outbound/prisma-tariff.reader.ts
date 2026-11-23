import { Injectable } from '@nestjs/common';
import type { Tariff } from '../../../../../prisma/generated/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TariffReaderPort } from '../../application/ports/tariff-reader.port';
import { Dec } from '../../domain/decimal';
import { ValuationTariff } from '../../domain/valuation.rules';

/** Scale of the Decimal(18,4) columns. */
const COLUMN_DECIMALS = 4;

@Injectable()
export class PrismaTariffReader implements TariffReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByPair(
    companyId: string,
    laborTypeId: string,
  ): Promise<ValuationTariff | null> {
    const row = await this.prisma.tariff.findUnique({
      where: { companyId_laborTypeId: { companyId, laborTypeId } },
    });
    return row ? toTariff(row) : null;
  }
}

function toTariff(row: Tariff): ValuationTariff {
  return {
    id: row.id,
    price: {
      money: {
        amount: Dec.parse(row.priceAmount.toFixed(COLUMN_DECIMALS)),
        unit: row.priceUnit,
        grain: row.priceGrain,
      },
      basis: row.priceBasis,
    },
    cost: {
      money: {
        amount: Dec.parse(row.costAmount.toFixed(COLUMN_DECIMALS)),
        unit: row.costUnit,
        grain: row.costGrain,
      },
      basis: row.costBasis,
    },
  };
}
