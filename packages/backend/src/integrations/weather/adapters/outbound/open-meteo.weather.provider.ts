import { Inject, Injectable } from '@nestjs/common';
import {
  HTTP_CLIENT,
  HttpClientPort,
} from '../../../shared/application/ports/http-client.ports';
import { UpstreamParseError } from '../../../shared/domain/errors';
import { WeatherSnapshot } from '../../domain/weather.types';
import { WeatherProviderPort } from '../../application/weather.ports';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEZONE = 'America/Argentina/Cordoba';
const CURRENT_FIELDS =
  'temperature_2m,wind_speed_10m,wind_direction_10m,precipitation';
const HOURLY_FIELDS = 'wind_speed_10m,wind_direction_10m,precipitation';
const DAILY_FIELDS = 'precipitation_sum,precipitation_probability_max';
const FORECAST_HOURS = 48;
const FORECAST_DAYS = 7;

/**
 * Viento en nudos nativo (`wind_speed_unit=kn`), así R005 no necesita
 * conversión en el cliente.
 *
 * Nota: `forecast_hours` (horario) y `forecast_days` (diario) son parámetros
 * independientes. La serie horaria se acota a 48 h —la jornada de hoy y la de
 * mañana, que es lo que se mira antes de fumigar— mientras el pronóstico diario
 * cubre los 7 días de R003. Repetir `forecast_days` NO acota la serie horaria:
 * Open-Meteo se queda con el último valor y devuelve 168 horas (verificado
 * contra la API real).
 */
export function buildOpenMeteoForecastUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: CURRENT_FIELDS,
    hourly: HOURLY_FIELDS,
    daily: DAILY_FIELDS,
    forecast_hours: String(FORECAST_HOURS),
    forecast_days: String(FORECAST_DAYS),
    wind_speed_unit: 'kn',
    timezone: TIMEZONE,
  });

  return `${FORECAST_URL}?${params.toString()}`;
}

@Injectable()
export class OpenMeteoWeatherProvider implements WeatherProviderPort {
  constructor(@Inject(HTTP_CLIENT) private readonly http: HttpClientPort) {}

  async fetchCurrent(input: {
    lat: number;
    lon: number;
  }): Promise<WeatherSnapshot> {
    const response = await this.http.request({
      url: buildOpenMeteoForecastUrl(input.lat, input.lon),
    });

    return mapOpenMeteoForecast(parseJson(response.body));
  }
}

export function mapOpenMeteoForecast(payload: unknown): WeatherSnapshot {
  const record = payload as Record<string, unknown> | null;

  if (!isRecord(record)) {
    throw new UpstreamParseError('Open-Meteo payload is not an object');
  }

  const current = record.current;
  const hourly = record.hourly;
  const daily = record.daily;

  if (!isRecord(current) || !isRecord(hourly) || !isRecord(daily)) {
    throw new UpstreamParseError(
      'Open-Meteo payload is missing the current, hourly or daily block',
    );
  }

  return {
    current: {
      temperatureC: requireNumber(
        current.temperature_2m,
        'current.temperature_2m',
      ),
      windSpeedKnots: requireNumber(
        current.wind_speed_10m,
        'current.wind_speed_10m',
      ),
      windDirectionDeg: requireNumber(
        current.wind_direction_10m,
        'current.wind_direction_10m',
      ),
      precipitationMm: requireNumber(
        current.precipitation,
        'current.precipitation',
      ),
    },
    hourly: toHourlySeries(hourly),
    daily: toDailySeries(daily),
  };
}

function toHourlySeries(hourly: Record<string, unknown>) {
  const times = requireStringArray(hourly.time, 'hourly.time');
  const windSpeeds = requireNumberArray(
    hourly.wind_speed_10m,
    'hourly.wind_speed_10m',
  );
  const windDirections = requireNumberArray(
    hourly.wind_direction_10m,
    'hourly.wind_direction_10m',
  );
  const precipitations = requireNumberArray(
    hourly.precipitation,
    'hourly.precipitation',
  );

  assertSameLength('hourly', times.length, [
    windSpeeds.length,
    windDirections.length,
    precipitations.length,
  ]);

  return times.map((time, index) => ({
    time,
    windSpeedKnots: windSpeeds[index],
    windDirectionDeg: windDirections[index],
    precipitationMm: precipitations[index],
  }));
}

function toDailySeries(daily: Record<string, unknown>) {
  const dates = requireStringArray(daily.time, 'daily.time');
  const precipitationSums = requireNumberArray(
    daily.precipitation_sum,
    'daily.precipitation_sum',
  );
  const precipitationProbabilities = requireNullableNumberArray(
    daily.precipitation_probability_max,
    'daily.precipitation_probability_max',
  );

  assertSameLength('daily', dates.length, [
    precipitationSums.length,
    precipitationProbabilities.length,
  ]);

  return dates.map((date, index) => ({
    date,
    precipitationSumMm: precipitationSums[index],
    precipitationProbabilityMax: precipitationProbabilities[index],
  }));
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new UpstreamParseError('Open-Meteo response is not valid JSON');
  }
}

function assertSameLength(
  block: string,
  expected: number,
  lengths: number[],
): void {
  if (lengths.some((length) => length !== expected)) {
    throw new UpstreamParseError(
      `Open-Meteo ${block} series have mismatched lengths`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new UpstreamParseError(`Open-Meteo field ${field} is not a number`);
  }

  return value;
}

function requireNumberArray(value: unknown, field: string): number[] {
  if (!Array.isArray(value)) {
    throw new UpstreamParseError(`Open-Meteo field ${field} is not an array`);
  }

  return value.map((item, index) =>
    requireNumber(item, `${field}[${index}]`),
  );
}

function requireNullableNumberArray(
  value: unknown,
  field: string,
): Array<number | null> {
  if (!Array.isArray(value)) {
    throw new UpstreamParseError(`Open-Meteo field ${field} is not an array`);
  }

  return value.map((item, index) => {
    if (item === null || item === undefined) {
      return null;
    }

    return requireNumber(item, `${field}[${index}]`);
  });
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new UpstreamParseError(
      `Open-Meteo field ${field} is not an array of strings`,
    );
  }

  return value as string[];
}
