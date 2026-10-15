import { InMemoryTtlCache } from '../../../shared/adapters/outbound/in-memory-ttl-cache';
import { ClockPort } from '../../../shared/application/ports/clock.ports';
import {
  UpstreamError,
  UpstreamUnavailableError,
} from '../../../shared/domain/errors';
import { PizarraSnapshot } from '../../domain/grain-price.types';
import { GrainPriceProviderPort } from '../grain-price.ports';
import {
  GRAIN_PRICE_CACHE_KEY,
  GRAIN_PRICE_CACHE_TTL_MS,
  GetGrainPricesUseCase,
} from './get-grain-prices.use-case';

class FakeClock implements ClockPort {
  private current: Date;

  constructor(start: string) {
    this.current = new Date(start);
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

const pizarraSnapshot: PizarraSnapshot = {
  source: 'cac.bcr.com.ar',
  date: '2026-10-14',
  publishedAt: '2026-10-15T10:16:00-03:00',
  bnaRate: 1504,
  prices: [
    {
      grain: 'trigo',
      label: 'Trigo',
      pricePerTonArs: 346000,
      pricePerTonUsd: 230.05,
    },
  ],
};

function createHarness() {
  const clock = new FakeClock('2026-10-15T15:00:00.000Z');
  const cache = new InMemoryTtlCache();
  const provider: jest.Mocked<GrainPriceProviderPort> = {
    fetchPizarra: jest.fn().mockResolvedValue(pizarraSnapshot),
  };

  const useCase = new GetGrainPricesUseCase(cache, clock, provider);

  return { useCase, clock, cache, provider };
}

describe('GetGrainPricesUseCase', () => {
  it('fetches the pizarra and returns it as fresh on a cold cache', async () => {
    const { useCase, cache } = createHarness();

    const output = await useCase.execute();

    expect(output).toEqual({
      ...pizarraSnapshot,
      stale: false,
      fetchedAt: '2026-10-15T15:00:00.000Z',
    });
    expect(await cache.get(GRAIN_PRICE_CACHE_KEY)).not.toBeNull();
  });

  it('serves the cached value without touching the provider while the 24h TTL is valid', async () => {
    const { useCase, clock, provider } = createHarness();

    await useCase.execute();
    clock.advance(GRAIN_PRICE_CACHE_TTL_MS - 1000);
    const output = await useCase.execute();

    expect(output.stale).toBe(false);
    expect(output.fetchedAt).toBe('2026-10-15T15:00:00.000Z');
    expect(provider.fetchPizarra).toHaveBeenCalledTimes(1);
  });

  it('refreshes from the provider once the TTL has expired', async () => {
    const { useCase, clock, provider } = createHarness();

    await useCase.execute();
    clock.advance(GRAIN_PRICE_CACHE_TTL_MS + 1000);

    const output = await useCase.execute();

    expect(provider.fetchPizarra).toHaveBeenCalledTimes(2);
    expect(output.stale).toBe(false);
    expect(output.fetchedAt).toBe('2026-10-16T15:00:01.000Z');
  });

  it('degrades to the cached value marked as stale when the provider fails', async () => {
    const { useCase, clock, provider } = createHarness();

    await useCase.execute();
    clock.advance(GRAIN_PRICE_CACHE_TTL_MS + 1000);
    provider.fetchPizarra.mockRejectedValueOnce(
      new UpstreamError(503, 'https://www.cac.bcr.com.ar/es/precios-de-pizarra'),
    );

    const output = await useCase.execute();

    expect(output.stale).toBe(true);
    expect(output.fetchedAt).toBe('2026-10-15T15:00:00.000Z');
    expect(output.bnaRate).toBe(pizarraSnapshot.bnaRate);
    expect(output.prices).toEqual(pizarraSnapshot.prices);
  });

  it('propagates the upstream failure when there is no cached value', async () => {
    const { useCase, provider } = createHarness();
    provider.fetchPizarra.mockRejectedValueOnce(
      new UpstreamUnavailableError('provider unreachable'),
    );

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });
});
