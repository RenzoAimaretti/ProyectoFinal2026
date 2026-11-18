import { Inject, Injectable } from '@nestjs/common';
import {
  HTTP_CLIENT,
  HttpClientPort,
} from '../../../shared/application/ports/http-client.ports';
import { UpstreamParseError } from '../../../shared/domain/errors';
import { RadarSnapshot } from '../../domain/weather.types';
import { RadarProviderPort } from '../../application/weather.ports';

export const RAINVIEWER_WEATHER_MAPS_URL =
  'https://api.rainviewer.com/public/weather-maps.json';

/**
 * Frames del radar público de RainViewer. El backend solo entrega la
 * plantilla: los tiles los pide el cliente al CDN, nunca se proxean por acá.
 */
@Injectable()
export class RainViewerRadarProvider implements RadarProviderPort {
  constructor(@Inject(HTTP_CLIENT) private readonly http: HttpClientPort) {}

  async fetchRadar(): Promise<RadarSnapshot> {
    const response = await this.http.request({
      url: RAINVIEWER_WEATHER_MAPS_URL,
    });

    return mapRainViewerWeatherMaps(parseJson(response.body));
  }
}

export function mapRainViewerWeatherMaps(payload: unknown): RadarSnapshot {
  const record = payload as
    | { host?: unknown; radar?: { past?: unknown } }
    | null;
  const host = record?.host;
  const past = record?.radar?.past;

  if (
    typeof host !== 'string' ||
    host.length === 0 ||
    !Array.isArray(past) ||
    past.length === 0
  ) {
    throw new UpstreamParseError(
      'RainViewer payload does not expose a host and radar frames',
    );
  }

  const frames = past.map((frame, index) => {
    const candidate = frame as { time?: unknown; path?: unknown };

    if (
      typeof candidate?.time !== 'number' ||
      typeof candidate?.path !== 'string'
    ) {
      throw new UpstreamParseError(
        `RainViewer frame ${index} is missing its time or path`,
      );
    }

    return { time: new Date(candidate.time * 1000).toISOString(), path: candidate.path };
  });

  const latestFrame = frames[frames.length - 1];

  return {
    host,
    frames,
    tileTemplate: `${host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
    // El compuesto de RainViewer es global y su cobertura sobre Argentina es
    // imperfecta, así que se marca siempre y el fallback de precipitación de
    // Open-Meteo queda disponible (design §2.5 / §6: el umbral fino por zona
    // sigue abierto).
    coverageWarning: true,
  };
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new UpstreamParseError('RainViewer response is not valid JSON');
  }
}
