import { CachePort } from '../../../shared/application/ports/cache.ports';
import { ClockPort } from '../../../shared/application/ports/clock.ports';
import {
  UpstreamError,
  UpstreamUnavailableError,
} from '../../../shared/domain/errors';
import { UsdRateSnapshot } from '../../domain/exchange-rate.types';
import { ExchangeRateProviderPort } from '../exchange-rate.ports';

/** El dólar oficial se mueve en esta escala; la pizarra diaria usa 24 h. */
export const EXCHANGE_RATE_CACHE_TTL_MS = 30 * 60 * 1000;

/** Dato de mercado global: una sola clave, sin tenant (spec A9). */
export const EXCHANGE_RATE_CACHE_KEY = 'exchange-rate:usd-oficial';

export type UsdRateOutput = UsdRateSnapshot & {
  stale: boolean;
  /** ISO 8601 */
  fetchedAt: string;
};

export class GetUsdOfficialUseCase {
  constructor(
    private readonly cache: CachePort,
    private readonly clock: ClockPort,
    private readonly provider: ExchangeRateProviderPort,
  ) {}

  async execute(): Promise<UsdRateOutput> {
    const cached = await this.cache.get<UsdRateSnapshot>(EXCHANGE_RATE_CACHE_KEY);

    if (cached && this.isFresh(cached.storedAt)) {
      return this.toOutput(cached.value, false, cached.storedAt);
    }

    try {
      const fresh = await this.provider.fetchOfficialUsd();
      const storedAt = this.clock.now();
      await this.cache.set(EXCHANGE_RATE_CACHE_KEY, fresh, storedAt);

      return this.toOutput(fresh, false, storedAt);
    } catch (error) {
      if (cached && isUpstreamFailure(error)) {
        return this.toOutput(cached.value, true, cached.storedAt);
      }

      throw error;
    }
  }

  private isFresh(storedAt: Date): boolean {
    return (
      this.clock.now().getTime() - storedAt.getTime() <
      EXCHANGE_RATE_CACHE_TTL_MS
    );
  }

  private toOutput(
    value: UsdRateSnapshot,
    stale: boolean,
    fetchedAt: Date,
  ): UsdRateOutput {
    return { ...value, stale, fetchedAt: fetchedAt.toISOString() };
  }
}

function isUpstreamFailure(
  error: unknown,
): error is UpstreamError | UpstreamUnavailableError {
  return (
    error instanceof UpstreamError || error instanceof UpstreamUnavailableError
  );
}
