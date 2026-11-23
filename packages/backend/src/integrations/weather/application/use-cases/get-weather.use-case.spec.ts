import { InMemoryTtlCache } from '../../../shared/adapters/outbound/in-memory-ttl-cache';
import { ClockPort } from '../../../shared/application/ports/clock.ports';
import {
  InvalidInputError,
  UpstreamUnavailableError,
} from '../../../shared/domain/errors';
import { RadarSnapshot, WeatherSnapshot } from '../../domain/weather.types';
import {
  RadarProviderPort,
  WeatherProviderPort,
} from '../weather.ports';
import { WEATHER_CACHE_TTL_MS } from '../weather-cache.policy';
import { GetWeatherUseCase } from './get-weather.use-case';

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

const weatherSnapshot: WeatherSnapshot = {
  current: {
    temperatureC: 18.4,
    windSpeedKnots: 5.1,
    windDirectionDeg: 155,
    precipitationMm: 0,
  },
  hourly: [
    {
      time: '2026-10-15T00:00',
      windSpeedKnots: 5.1,
      windDirectionDeg: 155,
      precipitationMm: 0,
    },
  ],
  daily: [
    { date: '2026-10-15', precipitationSumMm: 1.2, precipitationProbabilityMax: 59 },
  ],
};

const radarSnapshot: RadarSnapshot = {
  host: 'https://tilecache.rainviewer.com',
  frames: [{ time: '2026-10-15T15:50:00.000Z', path: '/v2/radar/abc123' }],
  tileTemplate:
    'https://tilecache.rainviewer.com/v2/radar/abc123/256/{z}/{x}/{y}/2/1_1.png',
  coverageWarning: true,
};

function createHarness() {
  const clock = new FakeClock('2026-10-15T15:00:00.000Z');
  const cache = new InMemoryTtlCache();
  const weatherProvider: jest.Mocked<WeatherProviderPort> = {
    fetchCurrent: jest.fn().mockResolvedValue(weatherSnapshot),
  };
  const radarProvider: jest.Mocked<RadarProviderPort> = {
    fetchRadar: jest.fn().mockResolvedValue(radarSnapshot),
  };

  const useCase = new GetWeatherUseCase(
    cache,
    clock,
    weatherProvider,
    radarProvider,
  );

  return { useCase, clock, cache, weatherProvider, radarProvider };
}

describe('GetWeatherUseCase', () => {
  it('rejects coordinates outside their valid range', async () => {
    const { useCase } = createHarness();

    await expect(
      useCase.execute({ lat: 91, lon: -64.35 }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it('fetches the weather and composes the radar on a cold cache', async () => {
    const { useCase, weatherProvider, radarProvider } = createHarness();

    const output = await useCase.execute({ lat: -33.13, lon: -64.35 });

    expect(output.source).toBe('open-meteo+rainviewer');
    expect(output.location).toEqual({
      lat: -33.13,
      lon: -64.35,
      resolvedFrom: 'coordinates',
      lotId: null,
      usedFarmFallback: false,
    });
    expect(output.current).toEqual(weatherSnapshot.current);
    expect(output.hourly).toEqual(weatherSnapshot.hourly);
    expect(output.daily).toEqual(weatherSnapshot.daily);
    expect(output.radar).toEqual(radarSnapshot);
    expect(output.stale).toBe(false);
    expect(output.fetchedAt).toBe('2026-10-15T15:00:00.000Z');
    expect(weatherProvider.fetchCurrent).toHaveBeenCalledWith({
      lat: -33.13,
      lon: -64.35,
    });
    expect(radarProvider.fetchRadar).toHaveBeenCalledTimes(1);
  });

  it('serves the cached value without touching any provider while the TTL is valid', async () => {
    const { useCase, clock, weatherProvider, radarProvider } = createHarness();

    await useCase.execute({ lat: -33.13, lon: -64.35 });
    clock.advance(WEATHER_CACHE_TTL_MS - 1000);
    const output = await useCase.execute({ lat: -33.13, lon: -64.35 });

    expect(output.stale).toBe(false);
    expect(output.fetchedAt).toBe('2026-10-15T15:00:00.000Z');
    expect(weatherProvider.fetchCurrent).toHaveBeenCalledTimes(1);
    expect(radarProvider.fetchRadar).toHaveBeenCalledTimes(1);
  });

  it('refreshes from the provider once the TTL has expired', async () => {
    const { useCase, clock, weatherProvider } = createHarness();

    await useCase.execute({ lat: -33.13, lon: -64.35 });
    clock.advance(WEATHER_CACHE_TTL_MS + 1000);

    const output = await useCase.execute({ lat: -33.13, lon: -64.35 });

    expect(weatherProvider.fetchCurrent).toHaveBeenCalledTimes(2);
    expect(output.stale).toBe(false);
    expect(output.fetchedAt).toBe('2026-10-15T15:15:01.000Z');
  });

  it('rounds the coordinates to two decimals so neighbouring lots share one cache entry', async () => {
    const { useCase, weatherProvider } = createHarness();

    const output = await useCase.execute({ lat: -33.1349, lon: -64.3499 });

    expect(weatherProvider.fetchCurrent).toHaveBeenCalledWith({
      lat: -33.13,
      lon: -64.35,
    });
    expect(output.location.lat).toBe(-33.13);
    expect(output.location.lon).toBe(-64.35);

    await useCase.execute({ lat: -33.131, lon: -64.351 });
    expect(weatherProvider.fetchCurrent).toHaveBeenCalledTimes(1);
  });

  it('degrades to the cached value marked as stale when the provider fails', async () => {
    const { useCase, clock, weatherProvider } = createHarness();

    await useCase.execute({ lat: -33.13, lon: -64.35 });
    clock.advance(WEATHER_CACHE_TTL_MS + 1000);
    weatherProvider.fetchCurrent.mockRejectedValueOnce(
      new UpstreamUnavailableError('provider timed out'),
    );

    const output = await useCase.execute({ lat: -33.13, lon: -64.35 });

    expect(output.stale).toBe(true);
    expect(output.fetchedAt).toBe('2026-10-15T15:00:00.000Z');
    expect(output.current).toEqual(weatherSnapshot.current);
    expect(output.radar).toEqual(radarSnapshot);
  });

  it('propagates the upstream failure when there is no cached value to fall back on', async () => {
    const { useCase, weatherProvider } = createHarness();
    weatherProvider.fetchCurrent.mockRejectedValueOnce(
      new UpstreamUnavailableError('provider unreachable'),
    );

    await expect(
      useCase.execute({ lat: -33.13, lon: -64.35 }),
    ).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('keeps the weather usable when the radar provider fails', async () => {
    const { useCase, radarProvider } = createHarness();
    radarProvider.fetchRadar.mockRejectedValueOnce(
      new UpstreamUnavailableError('radar unreachable'),
    );

    const output = await useCase.execute({ lat: -33.13, lon: -64.35 });

    expect(output.radar).toBeNull();
    expect(output.source).toBe('open-meteo');
    expect(output.current).toEqual(weatherSnapshot.current);
    expect(output.stale).toBe(false);
  });

  it('honours the location resolution it is given by the caller', async () => {
    const { useCase } = createHarness();

    const output = await useCase.execute({
      lat: -33.15,
      lon: -64.35,
      location: {
        resolvedFrom: 'farm',
        lotId: 'lot-1',
        usedFarmFallback: true,
      },
    });

    expect(output.location).toEqual({
      lat: -33.15,
      lon: -64.35,
      resolvedFrom: 'farm',
      lotId: 'lot-1',
      usedFarmFallback: true,
    });
  });
});
