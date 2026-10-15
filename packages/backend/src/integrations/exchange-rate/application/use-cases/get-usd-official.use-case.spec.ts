import { InMemoryTtlCache } from '../../../shared/adapters/outbound/in-memory-ttl-cache';
import { ClockPort } from '../../../shared/application/ports/clock.ports';
import { UpstreamUnavailableError } from '../../../shared/domain/errors';
import { UsdRateSnapshot } from '../../domain/exchange-rate.types';
import { ExchangeRateProviderPort } from '../exchange-rate.ports';
import {
  EXCHANGE_RATE_CACHE_KEY,
  EXCHANGE_RATE_CACHE_TTL_MS,
  GetUsdOfficialUseCase,
} from './get-usd-official.use-case';

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

const usdSnapshot: UsdRateSnapshot = {
  source: 'dolarapi.com',
  casa: 'oficial',
  moneda: 'USD',
  nombre: 'Oficial',
  compra: 1480,
  venta: 1530,
  fechaActualizacion: '2026-10-15T17:00:00.000Z',
};

function createHarness() {
  const clock = new FakeClock('2026-10-15T17:05:00.000Z');
  const cache = new InMemoryTtlCache();
  const provider: jest.Mocked<ExchangeRateProviderPort> = {
    fetchOfficialUsd: jest.fn().mockResolvedValue(usdSnapshot),
  };

  const useCase = new GetUsdOfficialUseCase(cache, clock, provider);

  return { useCase, clock, cache, provider };
}

describe('GetUsdOfficialUseCase', () => {
  it('fetches the official rate and returns it as fresh on a cold cache', async () => {
    const { useCase, cache } = createHarness();

    const output = await useCase.execute();

    expect(output).toEqual({
      ...usdSnapshot,
      stale: false,
      fetchedAt: '2026-10-15T17:05:00.000Z',
    });
    expect(await cache.get(EXCHANGE_RATE_CACHE_KEY)).not.toBeNull();
  });

  it('serves the cached value without touching the provider while the TTL is valid', async () => {
    const { useCase, clock, provider } = createHarness();

    await useCase.execute();
    clock.advance(EXCHANGE_RATE_CACHE_TTL_MS - 1000);
    const output = await useCase.execute();

    expect(output.stale).toBe(false);
    expect(output.fetchedAt).toBe('2026-10-15T17:05:00.000Z');
    expect(provider.fetchOfficialUsd).toHaveBeenCalledTimes(1);
  });

  it('refreshes from the provider once the TTL has expired', async () => {
    const { useCase, clock, provider } = createHarness();

    await useCase.execute();
    clock.advance(EXCHANGE_RATE_CACHE_TTL_MS + 1000);

    const output = await useCase.execute();

    expect(provider.fetchOfficialUsd).toHaveBeenCalledTimes(2);
    expect(output.stale).toBe(false);
    expect(output.fetchedAt).toBe('2026-10-15T17:35:01.000Z');
  });

  it('degrades to the cached value marked as stale when the provider fails', async () => {
    const { useCase, clock, provider } = createHarness();

    await useCase.execute();
    clock.advance(EXCHANGE_RATE_CACHE_TTL_MS + 1000);
    provider.fetchOfficialUsd.mockRejectedValueOnce(
      new UpstreamUnavailableError('provider timed out'),
    );

    const output = await useCase.execute();

    expect(output.stale).toBe(true);
    expect(output.fetchedAt).toBe('2026-10-15T17:05:00.000Z');
    expect(output.compra).toBe(usdSnapshot.compra);
    expect(output.venta).toBe(usdSnapshot.venta);
  });

  it('propagates the upstream failure when there is no cached value', async () => {
    const { useCase, provider } = createHarness();
    provider.fetchOfficialUsd.mockRejectedValueOnce(
      new UpstreamUnavailableError('provider unreachable'),
    );

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });
});
