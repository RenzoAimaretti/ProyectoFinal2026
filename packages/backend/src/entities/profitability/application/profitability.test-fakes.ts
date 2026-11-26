import { Dec } from '../../valuation/domain/decimal';
import { MarketSnapshot } from '../../valuation/domain/market-snapshot';
import { Money } from '../../valuation/domain/money';
import { marketSnapshot } from '../../valuation/application/valuation.test-fakes';
import { ClockPort } from './ports/clock.port';
import {
  MarketSnapshotNeed,
  MarketSnapshotPort,
} from './ports/market-snapshot.port';
import { PendingValuationRetryPort } from './ports/pending-valuation-retry.port';
import {
  ActivityQuery,
  DetailExpense,
  DetailReport,
  ENTRY_KIND,
  EntryKind,
  LotActivity,
  LotDetailData,
  LotDetailQuery,
  LotInfo,
  PendingByLot,
  ProfitEntry,
  ProfitabilityReaderPort,
} from './ports/profitability-reader.port';

/** In-memory fakes shared by the profitability use case specs. */

export const NOW = new Date('2026-11-23T12:00:00Z');

export class FixedClock implements ClockPort {
  now(): Date {
    return NOW;
  }
}

export class RecordingRetry implements PendingValuationRetryPort {
  readonly calls: string[] = [];

  constructor(private readonly order: string[] = []) {}

  retry(companyId: string): Promise<void> {
    this.calls.push(companyId);
    this.order.push('retry');
    return Promise.resolve();
  }
}

export class FakeMarketSnapshot implements MarketSnapshotPort {
  readonly needs: MarketSnapshotNeed[] = [];

  constructor(
    private readonly snapshot: MarketSnapshot | Error = marketSnapshot(),
  ) {}

  getSnapshot(need: MarketSnapshotNeed): Promise<MarketSnapshot> {
    this.needs.push(need);
    return this.snapshot instanceof Error
      ? Promise.reject(this.snapshot)
      : Promise.resolve(this.snapshot);
  }
}

export const ars = (amount: string): Money => ({
  amount: Dec.parse(amount),
  unit: 'ARS',
  grain: null,
});
export const usd = (amount: string): Money => ({
  amount: Dec.parse(amount),
  unit: 'USD',
  grain: null,
});
export const kg = (amount: string, grain: 'SOJA' | 'MAIZ' = 'SOJA'): Money => ({
  amount: Dec.parse(amount),
  unit: 'KG_CEREAL',
  grain,
});

export function lotInfo(overrides: Partial<LotInfo> = {}): LotInfo {
  return {
    lotId: 'lot-1',
    lotName: 'Lote 1',
    farmName: 'La Esperanza',
    clientName: 'Cliente A',
    areaHa: Dec.parse('100'),
    ...overrides,
  };
}

export function entry(
  kind: EntryKind,
  native: Money,
  arsAtApproval: string,
  lotId = 'lot-1',
): ProfitEntry {
  return { lotId, kind, native, arsAtApproval: Dec.parse(arsAtApproval) };
}

export const income = (native: Money, arsAtApproval: string, lotId = 'lot-1') =>
  entry(ENTRY_KIND.INCOME, native, arsAtApproval, lotId);
export const standardCost = (
  native: Money,
  arsAtApproval: string,
  lotId = 'lot-1',
) => entry(ENTRY_KIND.STANDARD_COST, native, arsAtApproval, lotId);
export const expense = (
  native: Money,
  arsAtApproval: string,
  lotId = 'lot-1',
) => entry(ENTRY_KIND.EXPENSE, native, arsAtApproval, lotId);

export function pending(
  lotId: string,
  reports: number,
  hectares: string,
): PendingByLot {
  return { lotId, reports, hectares: Dec.parse(hectares) };
}

/** What one company owns, like the rows a database filtered by company would hold. */
export interface CompanyData {
  tenantId: string;
  lots: LotInfo[];
  entries: ProfitEntry[];
  pending: PendingByLot[];
  reports?: Array<DetailReport & { lotId: string }>;
  expenses?: Array<DetailExpense & { lotId: string }>;
}

/**
 * Filters by the company of the query exactly as the Prisma reader must: it
 * never returns another company's rows, whatever else it holds.
 */
export class InMemoryProfitabilityReader implements ProfitabilityReaderPort {
  readonly activityQueries: ActivityQuery[] = [];
  readonly detailQueries: LotDetailQuery[] = [];

  /** `companyId` -> data. */
  constructor(
    private readonly data: Record<string, CompanyData>,
    private readonly order: string[] = [],
  ) {}

  findActivity(query: ActivityQuery): Promise<LotActivity> {
    this.activityQueries.push(query);
    this.order.push('read');
    const own = this.data[query.companyId];
    if (!own || own.tenantId !== query.tenantId) {
      return Promise.resolve({ lots: [], entries: [], pending: [] });
    }
    return Promise.resolve({
      lots: own.lots,
      entries: own.entries,
      pending: own.pending,
    });
  }

  findLotDetail(query: LotDetailQuery): Promise<LotDetailData | null> {
    this.detailQueries.push(query);
    const own = this.data[query.companyId];
    // A lot belongs to a tenant; it is visible to any company of that tenant.
    const lot = Object.values(this.data)
      .filter((company) => company.tenantId === query.tenantId)
      .flatMap((company) => company.lots)
      .find((item) => item.lotId === query.lotId);
    if (!lot) return Promise.resolve(null);

    const ownReports = (own?.reports ?? []).filter(
      (report) => report.lotId === query.lotId,
    );
    const ownExpenses = (own?.expenses ?? []).filter(
      (item) => item.lotId === query.lotId,
    );
    const pendingOfLot = (own?.pending ?? []).find(
      (item) => item.lotId === query.lotId,
    );
    return Promise.resolve({
      lot,
      reports: ownReports,
      expenses: ownExpenses,
      pending: {
        reports: pendingOfLot?.reports ?? 0,
        hectares: pendingOfLot?.hectares ?? Dec.parse('0'),
      },
    });
  }
}
