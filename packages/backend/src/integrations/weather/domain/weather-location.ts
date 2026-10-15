import { WeatherLocationUnresolvedError } from './errors';

export type Coordinates = { lat: number; lon: number };

export const MAX_LATITUDE = 90;
export const MAX_LONGITUDE = 180;

const SUPPORTED_GEOJSON_TYPES = new Set(['Polygon', 'MultiPolygon']);

/**
 * Centroide de `Lot.coords`, tolerante a los dos formatos que el dominio usa:
 * - GeoJSON (`{ type, coordinates }`), donde cada par es `[lon, lat]`.
 * - Array de pares `[[lat, lon], …]`, el formato corto del repo.
 *
 * Un polígono vacío, un par malformado o una coordenada fuera de rango lanzan
 * `WeatherLocationUnresolvedError`: nunca se devuelve una ubicación inventada.
 */
export function centroidOfCoords(coords: string): Coordinates {
  const points = parseVertexPairs(coords);

  if (points.length === 0) {
    throw new WeatherLocationUnresolvedError(
      'Lot coordinates do not contain any usable vertex',
    );
  }

  const total = points.reduce(
    (sum, point) => ({ lat: sum.lat + point.lat, lon: sum.lon + point.lon }),
    { lat: 0, lon: 0 },
  );

  return {
    lat: total.lat / points.length,
    lon: total.lon / points.length,
  };
}

function parseVertexPairs(raw: string): Coordinates[] {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new WeatherLocationUnresolvedError('Lot coordinates are empty');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new WeatherLocationUnresolvedError(
      'Lot coordinates are not valid JSON',
    );
  }

  let points: Coordinates[];

  if (isGeoJsonObject(parsed)) {
    const rawPairs: Array<[number, number]> = [];
    collectPairs(parsed.coordinates, rawPairs);
    // GeoJSON ordena cada posición como [lon, lat].
    points = rawPairs.map(([lon, lat]) => assertUsable({ lat, lon }));
  } else if (Array.isArray(parsed)) {
    const rawPairs: Array<[number, number]> = [];
    collectPairs(parsed, rawPairs);
    // Formato corto del repo: [[lat, lon], …].
    points = rawPairs.map(([lat, lon]) => assertUsable({ lat, lon }));
  } else {
    throw new WeatherLocationUnresolvedError(
      'Lot coordinates have an unsupported shape',
    );
  }

  return dropClosingVertex(points);
}

function isGeoJsonObject(
  value: unknown,
): value is { type?: unknown; coordinates: unknown } {
  if (!value || typeof value !== 'object' || !('coordinates' in value)) {
    return false;
  }

  const candidate = value as { type?: unknown; coordinates: unknown };

  if (!Array.isArray(candidate.coordinates)) {
    return false;
  }

  if (
    candidate.type !== undefined &&
    (typeof candidate.type !== 'string' ||
      !SUPPORTED_GEOJSON_TYPES.has(candidate.type))
  ) {
    throw new WeatherLocationUnresolvedError(
      'Lot coordinates declare an unsupported geometry type',
    );
  }

  return true;
}

/**
 * Walk recursivo que junta los pares `[number, number]` de cualquier anidado:
 * cubre el anillo de un `Polygon`, los anillos de un `MultiPolygon` y un array
 * plano de pares.
 */
function collectPairs(node: unknown, acc: Array<[number, number]>): void {
  if (!Array.isArray(node)) {
    return;
  }

  const [first, second] = node;

  if (typeof first === 'number' && typeof second === 'number') {
    acc.push([first, second]);
    return;
  }

  for (const child of node) {
    collectPairs(child, acc);
  }
}

function assertUsable(point: Coordinates): Coordinates {
  if (!Number.isFinite(point.lat) || Math.abs(point.lat) > MAX_LATITUDE) {
    throw new WeatherLocationUnresolvedError(
      'Lot coordinates contain an invalid latitude',
    );
  }

  if (!Number.isFinite(point.lon) || Math.abs(point.lon) > MAX_LONGITUDE) {
    throw new WeatherLocationUnresolvedError(
      'Lot coordinates contain an invalid longitude',
    );
  }

  return point;
}

/** Un anillo GeoJSON repite el primer vértice al cerrar; no debe sesgar el centroide. */
function dropClosingVertex(points: Coordinates[]): Coordinates[] {
  if (points.length < 2) {
    return points;
  }

  const first = points[0];
  const last = points[points.length - 1];

  if (first.lat === last.lat && first.lon === last.lon) {
    return points.slice(0, -1);
  }

  return points;
}
