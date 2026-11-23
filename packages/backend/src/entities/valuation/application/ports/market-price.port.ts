import { Grain } from '../../domain/money';
import { MarketSnapshot } from '../../domain/market-snapshot';
import { UsdRateType } from '../../domain/valuation-rate-policy';

export const MARKET_PRICE = Symbol('MARKET_PRICE');

export type { MarketSnapshot } from '../../domain/market-snapshot';

/** Lo que el caso de uso necesita del mercado; el adapter consulta solo eso. */
export interface MarketNeed {
  grains: Grain[];
  usd: boolean;
  /** Tipo de tasa que dicta la politica; BNA_PIZARRA exige leer la pizarra. */
  usdRateType?: UsdRateType;
}

export interface MarketPricePort {
  getSnapshot(need: MarketNeed): Promise<MarketSnapshot>;
}
