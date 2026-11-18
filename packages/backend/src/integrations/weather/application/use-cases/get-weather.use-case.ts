import { CachePort } from '../../../shared/application/ports/cache.ports';
import { ClockPort } from '../../../shared/application/ports/clock.ports';
import {
  UpstreamError,
  UpstreamUnavailableError,
} from '../../../shared/domain/errors';
import { RadarSnapshot } from '../../domain/weather.types';
import { RadarProviderPort, WeatherProviderPort } from '../weather.ports';
import {
  GetWeatherInput,
  WeatherLocationResolution,
  WeatherOutput,
} from '../weather.types';
import { assertLatitude, assertLongitude } from '../weather.validation';
import {
  WEATHER_CACHE_TTL_MS,
  roundCoordinate,
  weatherCacheKey,
} from '../weather-cache.policy';

/**
 * Lo que se guarda en cache: el payload de la fuente. `location`, `stale` y
 * `fetchedAt` se agregan por request, porque la procedencia de la ubicación
 * cambia aunque la zona (y por lo tanto la clave) sea la misma.
 */
type WeatherCacheValue = {
  source: WeatherOutput['source'];
  current: WeatherOutput['current'];
  hourly: WeatherOutput['hourly'];
  daily: WeatherOutput['daily'];
  radar: RadarSnapshot | null;
};

const DEFAULT_LOCATION: WeatherLocationResolution = {
  resolvedFrom: 'coordinates',
  lotId: null,
  usedFarmFallback: false,
};

export class GetWeatherUseCase {
  constructor(
    private readonly cache: CachePort,
    private readonly clock: ClockPort,
    private readonly weatherProvider: WeatherProviderPort,
    private readonly radarProvider: RadarProviderPort,
  ) {}

  async execute(input: GetWeatherInput): Promise<WeatherOutput> {
    const lat = roundCoordinate(assertLatitude(input.lat));
    const lon = roundCoordinate(assertLongitude(input.lon));
    const location = { lat, lon, ...(input.location ?? DEFAULT_LOCATION) };
    const key = weatherCacheKey(lat, lon);

    const cached = await this.cache.get<WeatherCacheValue>(key);

    if (cached && this.isFresh(cached.storedAt)) {
      return this.toOutput(cached.value, location, false, cached.storedAt);
    }

    try {
      const value = await this.loadFresh(lat, lon);
      const storedAt = this.clock.now();
      await this.cache.set(key, value, storedAt);

      return this.toOutput(value, location, false, storedAt);
    } catch (error) {
      if (cached && isUpstreamFailure(error)) {
        return this.toOutput(cached.value, location, true, cached.storedAt);
      }

      throw error;
    }
  }

  private isFresh(storedAt: Date): boolean {
    return this.clock.now().getTime() - storedAt.getTime() < WEATHER_CACHE_TTL_MS;
  }

  private async loadFresh(lat: number, lon: number): Promise<WeatherCacheValue> {
    const snapshot = await this.weatherProvider.fetchCurrent({ lat, lon });
    const radar = await this.fetchRadarSafely();

    return {
      source: radar ? 'open-meteo+rainviewer' : 'open-meteo',
      current: snapshot.current,
      hourly: snapshot.hourly,
      daily: snapshot.daily,
      radar,
    };
  }

  /**
   * El radar es complementario: si el CDN de tiles no responde, R004 se cubre
   * con la precipitación de Open-Meteo en lugar de tumbar la respuesta.
   */
  private async fetchRadarSafely(): Promise<RadarSnapshot | null> {
    try {
      return await this.radarProvider.fetchRadar();
    } catch (error) {
      if (isUpstreamFailure(error)) {
        return null;
      }

      throw error;
    }
  }

  private toOutput(
    value: WeatherCacheValue,
    location: WeatherOutput['location'],
    stale: boolean,
    fetchedAt: Date,
  ): WeatherOutput {
    return {
      source: value.source,
      location,
      current: value.current,
      hourly: value.hourly,
      daily: value.daily,
      radar: value.radar,
      stale,
      fetchedAt: fetchedAt.toISOString(),
    };
  }
}

function isUpstreamFailure(
  error: unknown,
): error is UpstreamError | UpstreamUnavailableError {
  return (
    error instanceof UpstreamError || error instanceof UpstreamUnavailableError
  );
}
