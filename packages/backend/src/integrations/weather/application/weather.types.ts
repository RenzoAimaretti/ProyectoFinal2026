import { RadarSnapshot, WeatherSnapshot } from '../domain/weather.types';

export type GetWeatherByCoordinatesInput = { lat: number; lon: number };

export type GetWeatherByLotInput = { lotId: string; tenantId: string };

export type WeatherLocationResolution = {
  resolvedFrom: 'coordinates' | 'lot' | 'farm';
  lotId: string | null;
  usedFarmFallback: boolean;
};

/**
 * Coordenadas explícitas más, opcionalmente, cómo se resolvieron. El caso por
 * lote resuelve primero el centroide y delega acá con su procedencia.
 */
export type GetWeatherInput = GetWeatherByCoordinatesInput & {
  location?: WeatherLocationResolution;
};

export type WeatherOutput = {
  source: 'open-meteo' | 'open-meteo+rainviewer';
  location: WeatherLocationResolution & { lat: number; lon: number };
  current: WeatherSnapshot['current'];
  hourly: WeatherSnapshot['hourly'];
  daily: WeatherSnapshot['daily'];
  radar: RadarSnapshot | null;
  stale: boolean;
  /** ISO 8601 */
  fetchedAt: string;
};
