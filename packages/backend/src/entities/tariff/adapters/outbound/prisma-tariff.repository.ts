import { Injectable } from '@nestjs/common';
import type { Tariff } from '../../../../../prisma/generated/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  TariffComponentOutput,
  TariffOutput,
} from '../../application/dto/tariff.output';
import {
  TariffRepositoryPort,
  UpsertTariffRecord,
} from '../../application/ports/tariff-repository.port';
import { TariffComponent } from '../../domain/tariff.rules';

/** Escala de las columnas Decimal(18,4): el cable lleva siempre 4 decimales. */
const WIRE_DECIMALS = 4;

@Injectable()
export class PrismaTariffRepository implements TariffRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByCompany(companyId: string): Promise<TariffOutput[]> {
    const rows = await this.prisma.tariff.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toOutput);
  }

  async upsert(record: UpsertTariffRecord): Promise<TariffOutput> {
    const { companyId, laborTypeId, userId, values } = record;
    const data = {
      priceAmount: values.price.money.amount.toString(),
      priceUnit: values.price.money.unit,
      priceGrain: values.price.money.grain,
      priceBasis: values.price.basis,
      costAmount: values.cost.money.amount.toString(),
      costUnit: values.cost.money.unit,
      costGrain: values.cost.money.grain,
      costBasis: values.cost.basis,
      updatedBy: userId,
    };

    const row = await this.prisma.tariff.upsert({
      where: { companyId_laborTypeId: { companyId, laborTypeId } },
      create: { companyId, laborTypeId, ...data },
      update: data,
    });
    return toOutput(row);
  }

  async deleteByPair(companyId: string, laborTypeId: string): Promise<boolean> {
    const result = await this.prisma.tariff.deleteMany({
      where: { companyId, laborTypeId },
    });
    return result.count > 0;
  }
}

function toOutput(row: Tariff): TariffOutput {
  return {
    id: row.id,
    laborTypeId: row.laborTypeId,
    price: component(
      row.priceAmount.toFixed(WIRE_DECIMALS),
      row.priceUnit,
      row.priceGrain,
      row.priceBasis,
    ),
    cost: component(
      row.costAmount.toFixed(WIRE_DECIMALS),
      row.costUnit,
      row.costGrain,
      row.costBasis,
    ),
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function component(
  amount: string,
  unit: TariffComponentOutput['unit'],
  grain: TariffComponentOutput['grain'],
  basis: TariffComponent['basis'],
): TariffComponentOutput {
  return { amount, unit, grain, basis };
}
