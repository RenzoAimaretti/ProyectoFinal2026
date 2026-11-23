import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HttpClientPort,
  HttpRequest,
  HttpResponse,
} from '../../../shared/application/ports/http-client.ports';
import { UpstreamParseError } from '../../../shared/domain/errors';
import {
  RAINVIEWER_WEATHER_MAPS_URL,
  RainViewerRadarProvider,
} from './rainviewer.radar.provider';

const weatherMapsFixture = JSON.parse(
  readFileSync(
    join(__dirname, '__fixtures__', 'rainviewer-weather-maps.json'),
    'utf8',
  ),
) as {
  host: string;
  radar: { past: Array<{ time: number; path: string }> };
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

describe('RainViewerRadarProvider', () => {
  it('maps the captured payload into host, frames and a tile template', async () => {
    const http = createHttpClient(JSON.stringify(weatherMapsFixture));

    const radar = await new RainViewerRadarProvider(http.client).fetchRadar();

    expect(http.request).toHaveBeenCalledTimes(1);
    expect(http.request.mock.calls[0][0].url).toBe(RAINVIEWER_WEATHER_MAPS_URL);

    expect(radar.host).toBe(weatherMapsFixture.host);
    expect(radar.frames).toHaveLength(weatherMapsFixture.radar.past.length);

    const latestFrame =
      weatherMapsFixture.radar.past[weatherMapsFixture.radar.past.length - 1];
    expect(radar.frames[radar.frames.length - 1]).toEqual({
      time: new Date(latestFrame.time * 1000).toISOString(),
      path: latestFrame.path,
    });
    expect(radar.tileTemplate).toBe(
      `${weatherMapsFixture.host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
    );
  });

  it('flags the coverage warning instead of pretending the composite covers the zone', async () => {
    const http = createHttpClient(JSON.stringify(weatherMapsFixture));

    const radar = await new RainViewerRadarProvider(http.client).fetchRadar();

    expect(radar.coverageWarning).toBe(true);
  });

  it('rejects a payload without frames', async () => {
    const http = createHttpClient(
      JSON.stringify({ host: 'https://tilecache.rainviewer.com', radar: { past: [] } }),
    );

    await expect(
      new RainViewerRadarProvider(http.client).fetchRadar(),
    ).rejects.toBeInstanceOf(UpstreamParseError);
  });
});
