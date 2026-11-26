import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  SaveValuationResult,
  ValuationRecord,
  ValuationRepositoryPort,
} from '../../application/ports/valuation-repository.port';

const UNIQUE_VIOLATION = 'P2002';
const UNIQUE_COLUMN = 'dailyReportId';

@Injectable()
export class PrismaValuationRepository implements ValuationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async saveIfAbsent(record: ValuationRecord): Promise<SaveValuationResult> {
    const { tariff, computation } = record;

    try {
      await this.prisma.dailyReportValuation.create({
        data: {
          dailyReportId: record.dailyReportId,
          companyId: record.companyId,
          lotId: record.lotId,
          tariffId: tariff.id,
          origin: record.origin,
          priceAmount: tariff.price.money.amount.toString(),
          priceUnit: tariff.price.money.unit,
          priceGrain: tariff.price.money.grain,
          priceBasis: tariff.price.basis,
          costAmount: tariff.cost.money.amount.toString(),
          costUnit: tariff.cost.money.unit,
          costGrain: tariff.cost.money.grain,
          costBasis: tariff.cost.basis,
          hectares: computation.hectares.toString(),
          hours: computation.hours.toString(),
          incomeNative: computation.incomeNative.toString(),
          costNative: computation.costNative.toString(),
          incomeGrainArsPerTon:
            computation.incomeGrainArsPerTon?.toString() ?? null,
          costGrainArsPerTon:
            computation.costGrainArsPerTon?.toString() ?? null,
          usdRate: computation.usdRate?.toString() ?? null,
          usdRateType: computation.usdRateType,
          grainSource: computation.grainSource,
          usdSource: computation.usdSource,
          priceFetchedAt: computation.priceFetchedAt,
          priceStale: computation.priceStale,
          incomeArs: computation.incomeArs.toString(),
          costArs: computation.costArs.toString(),
          valuedAt: record.valuedAt,
        },
      });
      return 'CREATED';
    } catch (error) {
      // The unique index on dailyReportId is the idempotency guard: losing the
      // race to a concurrent retry is a normal outcome, not an error.
      if (isDailyReportIdConflict(error)) return 'ALREADY_EXISTS';
      throw error;
    }
  }
}

function isDailyReportIdConflict(error: unknown): boolean {
  if (
    !(error instanceof PrismaClientKnownRequestError) ||
    error.code !== UNIQUE_VIOLATION
  ) {
    return false;
  }

  const columns = conflictingColumns(error.meta);
  // Metadata varies by driver; when it is absent the only unique index that
  // can fire on this insert besides the generated id is dailyReportId.
  return columns === null || columns.some((c) => c.includes(UNIQUE_COLUMN));
}

function conflictingColumns(
  meta: Record<string, unknown> | undefined,
): string[] | null {
  const target = meta?.target;
  if (typeof target === 'string') return [target];
  if (Array.isArray(target)) return target.map(String);

  const fields = (
    meta?.driverAdapterError as
      | { cause?: { constraint?: { fields?: unknown } } }
      | undefined
  )?.cause?.constraint?.fields;
  if (Array.isArray(fields)) return fields.map(String);

  return null;
}
