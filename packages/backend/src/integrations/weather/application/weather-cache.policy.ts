/** El clima actual cambia en esta escala; más corto castiga al proveedor sin ganancia. */
export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;

/** Redondeo a 2 decimales (~1 km) para acotar el espacio de claves. */
export function roundCoordinate(value: number): number {
  return Number(value.toFixed(2));
}

/** Mismo tile para lotes vecinos: una entrada por zona, no una por lote. */
export function weatherCacheKey(lat: number, lon: number): string {
  return `weather:${lat.toFixed(2)},${lon.toFixed(2)}`;
}
