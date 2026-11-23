import { GetUsdOfficialUseCase } from '../../../../integrations/exchange-rate/application/use-cases/get-usd-official.use-case';
import { GetGrainPricesUseCase } from '../../../../integrations/grain-price/application/use-cases/get-grain-prices.use-case';
import {
  UpstreamError,
  UpstreamParseError,
  UpstreamUnavailableError,
} from '../../../../integrations/shared/domain/errors';
import {
  MarketNeed,
  MarketPricePort,
} from '../../application/ports/market-price.port';
import { Dec } from '../../domain/decimal';
import { MarketSnapshot, UsdRates } from '../../domain/market-snapshot';
import { GRAIN, Grain } from '../../domain/money';
import { USD_RATE_TYPE } from '../../domain/valuation-rate-policy';

type GrainOutput = Awaited<ReturnType<GetGrainPricesUseCase['execute']>>;
type UsdOutput = Awaited<ReturnType<GetUsdOfficialUseCase['execute']>>;

const GRAIN_BY_BOARD_KEY: Record<string, Grain> = {
  trigo: GRAIN.TRIGO,
  maiz: GRAIN.MAIZ,
  girasol: GRAIN.GIRASOL,
  soja: GRAIN.SOJA,
  sorgo: GRAIN.SORGO,
};

function isUpstreamFailure(error: unknown): boolean {
  return (
    error instanceof UpstreamError ||
    error instanceof UpstreamUnavailableError ||
    error instanceof UpstreamParseError
  );
}

/**
 * Unica pieza de `valuation` que conoce las integraciones del Sprint 3. Consulta
 * solo lo que se necesita; un error upstream de un componente lo deja en `null`
 * (la decision de "sin valorizar" es del caso de uso, no del adapter).
 */
export class IntegrationsMarketPriceAdapter implements MarketPricePort {
  constructor(
    private readonly grainPrices: GetGrainPricesUseCase,
    private readonly usdOfficial: GetUsdOfficialUseCase,
  ) {}

  async getSnapshot(need: MarketNeed): Promise<MarketSnapshot> {
    const needsBnaRate =
      need.usd && need.usdRateType === USD_RATE_TYPE.BNA_PIZARRA;
    const [board, usd] = await Promise.all([
      need.grains.length > 0 || needsBnaRate
        ? this.fetchGrains()
        : Promise.resolve(null),
      need.usd ? this.fetchUsd() : Promise.resolve(null),
    ]);

    return {
      grainArsPerTon: this.pricesOf(need.grains, board),
      usd: usd ? this.usdRates(usd, needsBnaRate ? board : null) : null,
      sources: { grains: board?.source ?? null, usd: usd?.source ?? null },
      fetchedAt: {
        grains: board ? new Date(board.fetchedAt) : null,
        usd: usd ? new Date(usd.fetchedAt) : null,
      },
      stale: { grains: board?.stale ?? false, usd: usd?.stale ?? false },
    };
  }

  private async fetchGrains(): Promise<GrainOutput | null> {
    try {
      return await this.grainPrices.execute();
    } catch (error) {
      if (isUpstreamFailure(error)) return null;
      throw error;
    }
  }

  private async fetchUsd(): Promise<UsdOutput | null> {
    try {
      return await this.usdOfficial.execute();
    } catch (error) {
      if (isUpstreamFailure(error)) return null;
      throw error;
    }
  }

  private pricesOf(
    grains: Grain[],
    board: GrainOutput | null,
  ): MarketSnapshot['grainArsPerTon'] {
    const result: MarketSnapshot['grainArsPerTon'] = {};

    for (const grain of grains) {
      const row = board?.prices.find(
        (price) => GRAIN_BY_BOARD_KEY[price.grain] === grain,
      );
      result[grain] =
        row && row.pricePerTonArs !== null
          ? Dec.parse(String(row.pricePerTonArs))
          : null;
    }

    return result;
  }

  private usdRates(usd: UsdOutput, board: GrainOutput | null): UsdRates {
    return {
      oficialVenta: Dec.parse(String(usd.venta)),
      oficialCompra: Dec.parse(String(usd.compra)),
      bnaPizarra:
        board?.bnaRate != null ? Dec.parse(String(board.bnaRate)) : null,
    };
  }
}
