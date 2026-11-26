import { MarketSnapshot } from '../../../valuation/domain/market-snapshot';
import { Grain } from '../../../valuation/domain/money';

export const MARKET_SNAPSHOT = Symbol('PROFITABILITY_MARKET_SNAPSHOT');

export interface MarketSnapshotNeed {
  grains: Grain[];
  usd: boolean;
}

export interface MarketSnapshotPort {
  /** One photo of today's prices; a missing value inside it is `null`. */
  getSnapshot(need: MarketSnapshotNeed): Promise<MarketSnapshot>;
}
