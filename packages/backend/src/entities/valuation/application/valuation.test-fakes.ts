import { Dec } from '../domain/decimal';
import { MarketSnapshot } from '../domain/market-snapshot';
import { ValuationTariff } from '../domain/valuation.rules';
import { ClockPort } from './ports/clock.port';
import {
  DailyReportReaderPort,
  FindApprovedWithoutValuationQuery,
  PendingValuationSummary,
  ReportToValuate,
} from './ports/daily-report-reader.port';
import { MarketNeed, MarketPricePort } from './ports/market-price.port';
import { TariffReaderPort } from './ports/tariff-reader.port';
import {
  SaveValuationResult,
  ValuationRecord,
  ValuationRepositoryPort,
} from './ports/valuation-repository.port';

/** In-memory fakes shared by the valuation use case specs. */

export const NOW = new Date('2026-11-23T12:00:00Z');
export const FETCHED_AT = new Date('2026-11-23T11:55:00Z');

export class FixedClock implements ClockPort {
  now(): Date {
    return NOW;
  }
}

export function report(
  overrides: Partial<ReportToValuate> = {},
): ReportToValuate {
  return {
    id: 'report-1',
    companyId: 'company-1',
    lotId: 'lot-1',
    laborTypeId: 'labor-1',
    hectares: Dec.parse('12.5'),
    hours: Dec.parse('6'),
    ...overrides,
  };
}

export function marketSnapshot(
  overrides: Partial<MarketSnapshot> = {},
): MarketSnapshot {
  return {
    grainArsPerTon: { SOJA: Dec.parse('310000') },
    usd: {
      oficialVenta: Dec.parse('1530'),
      oficialCompra: Dec.parse('1500'),
      bnaPizarra: null,
    },
    sources: { grains: 'cac.bcr.com.ar', usd: 'dolarapi.com' },
    fetchedAt: { grains: FETCHED_AT, usd: FETCHED_AT },
    stale: { grains: false, usd: false },
    ...overrides,
  };
}

export class FakeMarketPrice implements MarketPricePort {
  readonly needs: MarketNeed[] = [];

  constructor(private snapshot: MarketSnapshot = marketSnapshot()) {}

  getSnapshot(need: MarketNeed): Promise<MarketSnapshot> {
    this.needs.push(need);
    return Promise.resolve(this.snapshot);
  }
}

export class FakeTariffReader implements TariffReaderPort {
  readonly calls: Array<[string, string]> = [];

  /** `companyId|laborTypeId` -> tariff. */
  constructor(private readonly tariffs: Record<string, ValuationTariff>) {}

  findByPair(companyId: string, laborTypeId: string) {
    this.calls.push([companyId, laborTypeId]);
    return Promise.resolve(this.tariffs[`${companyId}|${laborTypeId}`] ?? null);
  }
}

export class InMemoryValuationRepository implements ValuationRepositoryPort {
  readonly records = new Map<string, ValuationRecord>();
  readonly attempts: ValuationRecord[] = [];

  /** Atomic check-and-insert, like the unique index on `dailyReportId`. */
  saveIfAbsent(record: ValuationRecord): Promise<SaveValuationResult> {
    this.attempts.push(record);
    if (this.records.has(record.dailyReportId)) {
      return Promise.resolve('ALREADY_EXISTS');
    }
    this.records.set(record.dailyReportId, record);
    return Promise.resolve('CREATED');
  }
}

export class InMemoryDailyReportReader implements DailyReportReaderPort {
  readonly queries: FindApprovedWithoutValuationQuery[] = [];

  constructor(
    private readonly reports: ReportToValuate[],
    private readonly valuations: InMemoryValuationRepository,
  ) {}

  findApprovedById(companyId: string, reportId: string) {
    return Promise.resolve(
      this.reports.find(
        (item) => item.id === reportId && item.companyId === companyId,
      ) ?? null,
    );
  }

  findApprovedWithoutValuation(query: FindApprovedWithoutValuationQuery) {
    this.queries.push(query);
    return Promise.resolve(
      this.reports
        .filter(
          (item) =>
            item.companyId === query.companyId &&
            (query.laborTypeId === undefined ||
              item.laborTypeId === query.laborTypeId) &&
            !this.valuations.records.has(item.id),
        )
        .slice(0, query.limit),
    );
  }

  summarizePendingValuation(
    companyId: string,
  ): Promise<PendingValuationSummary> {
    const pending = this.reports.filter(
      (item) =>
        item.companyId === companyId && !this.valuations.records.has(item.id),
    );
    return Promise.resolve({
      count: pending.length,
      hectares: pending.reduce(
        (sum, item) => sum.add(item.hectares),
        Dec.parse('0'),
      ),
    });
  }
}
