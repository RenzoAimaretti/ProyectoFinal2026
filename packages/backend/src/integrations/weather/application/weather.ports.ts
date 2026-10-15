import { RadarSnapshot, WeatherSnapshot } from '../domain/weather.types';

export const WEATHER_PROVIDER = Symbol('WEATHER_PROVIDER');
export const RADAR_PROVIDER = Symbol('RADAR_PROVIDER');
export const LOT_LOCATION_READER = Symbol('LOT_LOCATION_READER');

export interface WeatherProviderPort {
  fetchCurrent(input: { lat: number; lon: number }): Promise<WeatherSnapshot>;
}

export interface RadarProviderPort {
  fetchRadar(): Promise<RadarSnapshot>;
}

export interface LotLocationRecord {
  coords: string | null;
  farmId: string;
  farmLocation: string | null;
}

export interface LotLocationReaderPort {
  /** Resuelve el lote DENTRO del tenant del caller (spec A9). */
  findByLotAndTenant(
    lotId: string,
    tenantId: string,
  ): Promise<LotLocationRecord | null>;
  /** Centroide de los lotes con polígono del campo, para el fallback. */
  centroidByFarmAndTenant(
    farmId: string,
    tenantId: string,
  ): Promise<{ lat: number; lon: number } | null>;
}
