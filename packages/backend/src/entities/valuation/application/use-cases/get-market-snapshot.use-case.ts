import { Grain } from '../../domain/money';
import { MarketSnapshot } from '../../domain/market-snapshot';
import { VALUATION_USD_RATE_TYPE } from '../../domain/valuation-rate-policy';
import { MarketPricePort } from '../ports/market-price.port';

export interface GetMarketSnapshotInput {
  grains: Grain[];
  usd: boolean;
}

/** Una sola foto de precios para varios montos (la usa, por ejemplo, la calculadora). */
export class GetMarketSnapshotUseCase {
  constructor(private readonly market: MarketPricePort) {}

  execute(input: GetMarketSnapshotInput): Promise<MarketSnapshot> {
    return this.market.getSnapshot({
      grains: input.grains,
      usd: input.usd,
      usdRateType: VALUATION_USD_RATE_TYPE,
    });
  }
}
