import { MarketSnapshot } from '../domain/market-snapshot';
import {
  UsdRateType,
  VALUATION_USD_RATE_TYPE,
} from '../domain/valuation-rate-policy';
import { computeValuation, marketNeedOf } from '../domain/valuation.rules';
import { ClockPort } from './ports/clock.port';
import { ReportToValuate } from './ports/daily-report-reader.port';
import { MarketPricePort } from './ports/market-price.port';
import { TariffReaderPort } from './ports/tariff-reader.port';
import {
  ValuationOrigin,
  ValuationRepositoryPort,
} from './ports/valuation-repository.port';

export type ValuationOutcome =
  | 'VALUADO'
  | 'SIN_TARIFA'
  | 'PRECIO_NO_DISPONIBLE'
  | 'YA_VALORIZADO';

const EMPTY_MARKET: MarketSnapshot = {
  grainArsPerTon: {},
  usd: null,
  sources: { grains: null, usd: null },
  fetchedAt: { grains: null, usd: null },
  stale: { grains: false, usd: false },
};

/**
 * Shared orchestration of "value one report": find the tariff, ask the market
 * only for what it needs, compute all-or-nothing and persist idempotently.
 * Used by the approval trigger and by the retry.
 */
export class ReportValuator {
  constructor(
    private readonly tariffs: TariffReaderPort,
    private readonly market: MarketPricePort,
    private readonly repository: ValuationRepositoryPort,
    private readonly clock: ClockPort,
    private readonly rateType: UsdRateType = VALUATION_USD_RATE_TYPE,
  ) {}

  async valuate(
    report: ReportToValuate,
    origin: ValuationOrigin,
  ): Promise<ValuationOutcome> {
    const tariff = await this.tariffs.findByPair(
      report.companyId,
      report.laborTypeId,
    );
    if (!tariff) return 'SIN_TARIFA';

    const need = marketNeedOf(tariff);
    // An ARS-only tariff never queries the providers.
    const snapshot =
      need.usd || need.grains.length > 0
        ? await this.market.getSnapshot({
            ...need,
            usdRateType: this.rateType,
          })
        : EMPTY_MARKET;

    const computation = computeValuation(
      report,
      tariff,
      snapshot,
      this.rateType,
    );
    if (!computation) return 'PRECIO_NO_DISPONIBLE';

    const saved = await this.repository.saveIfAbsent({
      dailyReportId: report.id,
      companyId: report.companyId,
      lotId: report.lotId,
      origin,
      tariff,
      computation,
      valuedAt: this.clock.now(),
    });
    return saved === 'CREATED' ? 'VALUADO' : 'YA_VALORIZADO';
  }
}
