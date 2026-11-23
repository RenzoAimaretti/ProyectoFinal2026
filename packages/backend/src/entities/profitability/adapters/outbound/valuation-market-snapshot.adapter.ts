import { GetMarketSnapshotUseCase } from '../../../valuation/application/use-cases/get-market-snapshot.use-case';
import { MarketSnapshot } from '../../../valuation/domain/market-snapshot';
import {
  MarketSnapshotNeed,
  MarketSnapshotPort,
} from '../../application/ports/market-snapshot.port';

/** Consumer port of `profitability` over the exported `valuation` use case. */
export class ValuationMarketSnapshotAdapter implements MarketSnapshotPort {
  constructor(private readonly snapshot: GetMarketSnapshotUseCase) {}

  getSnapshot(need: MarketSnapshotNeed): Promise<MarketSnapshot> {
    return this.snapshot.execute({ grains: need.grains, usd: need.usd });
  }
}
