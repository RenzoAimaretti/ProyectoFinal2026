import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpClientPort, HttpRequest, HttpResponse } from '../../../shared/application/ports/http-client.ports';
import { UpstreamParseError } from '../../../shared/domain/errors';
import { OpenMeteoWeatherProvider } from './open-meteo.weather.provider';

const forecastFixture = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__', 'open-meteo-forecast.json'), 'utf8'),
) as {
  current: {
    temperature_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    precipitation: number;
  };
  hourly: {
    time: string[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    precipitation: number[];
  };
  daily: {
    time: string[];
    precipitation_sum: number[];
    precipitation_probability_max: Array<number | null>;
  };
};

function createHttpClient(body: string) {
  const request = jest.fn(
    async (_input: HttpRequest): Promise<HttpResponse> => ({
      status: 200,
      headers: {},
      body,
    }),
  );

  return { client: { request } satisfies HttpClientPort, request };
}

describe('OpenMeteoWeatherProvider', () => {
  it('builds the Open-Meteo request with knots, the Cordoba timezone, a 48h hourly window and 7 daily days', async () => {
    const http = createHttpClient(JSON.stringify(forecastFixture));

    await new OpenMeteoWeatherProvider(http.client).fetchCurrent({
      lat: -33.13,
      lon: -64.35,
    });

    expect(http.request).toHaveBeenCalledTimes(1);
    const requestedUrl = new URL(http.request.mock.calls[0][0].url);

    expect(`${requestedUrl.origin}${requestedUrl.pathname}`).toBe(
      'https://api.open-meteo.com/v1/forecast',
    );
    expect(requestedUrl.searchParams.get('latitude')).toBe('-33.13');
    expect(requestedUrl.searchParams.get('longitude')).toBe('-64.35');
    expect(requestedUrl.searchParams.get('wind_speed_unit')).toBe('kn');
    expect(requestedUrl.searchParams.get('timezone')).toBe(
      'America/Argentina/Cordoba',
    );
    expect(requestedUrl.searchParams.get('forecast_hours')).toBe('48');
    expect(requestedUrl.searchParams.get('forecast_days')).toBe('7');
    expect(requestedUrl.searchParams.get('current')).toBe(
      'temperature_2m,wind_speed_10m,wind_direction_10m,precipitation',
    );
    expect(requestedUrl.searchParams.get('hourly')).toBe(
      'wind_speed_10m,wind_direction_10m,precipitation',
    );
    expect(requestedUrl.searchParams.get('daily')).toBe(
      'precipitation_sum,precipitation_probability_max',
    );
  });

  it('maps the captured payload to a weather snapshot', async () => {
    const http = createHttpClient(JSON.stringify(forecastFixture));

    const snapshot = await new OpenMeteoWeatherProvider(http.client).fetchCurrent({
      lat: -33.13,
      lon: -64.35,
    });

    expect(snapshot.current).toEqual({
      temperatureC: forecastFixture.current.temperature_2m,
      windSpeedKnots: forecastFixture.current.wind_speed_10m,
      windDirectionDeg: forecastFixture.current.wind_direction_10m,
      precipitationMm: forecastFixture.current.precipitation,
    });

    expect(snapshot.hourly).toHaveLength(forecastFixture.hourly.time.length);
    expect(snapshot.hourly[0]).toEqual({
      time: forecastFixture.hourly.time[0],
      windSpeedKnots: forecastFixture.hourly.wind_speed_10m[0],
      windDirectionDeg: forecastFixture.hourly.wind_direction_10m[0],
      precipitationMm: forecastFixture.hourly.precipitation[0],
    });

    expect(snapshot.daily).toHaveLength(7);
    expect(snapshot.daily.map((day) => day.date)).toEqual(
      forecastFixture.daily.time,
    );
    expect(snapshot.daily[0]).toEqual({
      date: forecastFixture.daily.time[0],
      precipitationSumMm: forecastFixture.daily.precipitation_sum[0],
      precipitationProbabilityMax:
        forecastFixture.daily.precipitation_probability_max[0],
    });
  });

  it('keeps a missing precipitation probability as null instead of a fake zero', async () => {
    const http = createHttpClient(
      JSON.stringify({
        current: {
          temperature_2m: 18.4,
          wind_speed_10m: 5.1,
          wind_direction_10m: 155,
          precipitation: 0,
        },
        hourly: {
          time: ['2026-10-15T00:00'],
          wind_speed_10m: [5.1],
          wind_direction_10m: [155],
          precipitation: [0],
        },
        daily: {
          time: ['2026-10-15'],
          precipitation_sum: [1.2],
          precipitation_probability_max: [null],
        },
      }),
    );

    const snapshot = await new OpenMeteoWeatherProvider(http.client).fetchCurrent({
      lat: -33.13,
      lon: -64.35,
    });

    expect(snapshot.daily[0].precipitationProbabilityMax).toBeNull();
  });

  it('rejects a payload that does not match the expected shape', async () => {
    const http = createHttpClient(JSON.stringify({ latitude: -33.13 }));

    await expect(
      new OpenMeteoWeatherProvider(http.client).fetchCurrent({
        lat: -33.13,
        lon: -64.35,
      }),
    ).rejects.toBeInstanceOf(UpstreamParseError);
  });

  it('rejects a body that is not JSON', async () => {
    const http = createHttpClient('<html>maintenance</html>');

    await expect(
      new OpenMeteoWeatherProvider(http.client).fetchCurrent({
        lat: -33.13,
        lon: -64.35,
      }),
    ).rejects.toBeInstanceOf(UpstreamParseError);
  });
});
