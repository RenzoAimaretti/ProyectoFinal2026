import { CachePort } from '../../../shared/application/ports/cache.ports';
import { ClockPort } from '../../../shared/application/ports/clock.ports';
import {
  UpstreamError,
  UpstreamUnavailableError,
} from '../../../shared/domain/errors';
import { PizarraSnapshot } from '../../domain/grain-price.types';
import { GrainPriceProviderPort } from '../grain-price.ports';

/** La pizarra se publica una vez por día, así que el TTL es de 24 h. */
export const GRAIN_PRICE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Dato de mercado global: una sola clave, sin tenant (spec A9). */
export const GRAIN_PRICE_CACHE_KEY = 'grain-price:pizarra-bcr';

export type GrainPricesOutput = PizarraSnapshot & {
  stale: boolean;
  /** ISO 8601 */
  fetchedAt: string;
};

export class GetGrainPricesUseCase {
  constructor(
    private readonly cache: CachePort,
    private readonly clock: ClockPort,
    private readonly provider: GrainPriceProviderPort,
  ) {}

  async execute(): Promise<GrainPricesOutput> {
    const cached = await this.cache.get<PizarraSnapshot>(GRAIN_PRICE_CACHE_KEY);

    if (cached && this.isFresh(cached.storedAt)) {
      return this.toOutput(cached.value, false, cached.storedAt);
    }

    try {
      const fresh = await this.provider.fetchPizarra();
      const storedAt = this.clock.now();
      await this.cache.set(GRAIN_PRICE_CACHE_KEY, fresh, storedAt);

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
      GRAIN_PRICE_CACHE_TTL_MS
    );
  }

  private toOutput(
    value: PizarraSnapshot,
    stale: boolean,
    fetchedAt: Date,
  ): GrainPricesOutput {
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
