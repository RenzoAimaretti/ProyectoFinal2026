import { InvalidInputError } from './errors';

export type GeoJsonPosition = [number, number];

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: GeoJsonPosition[][];
};

const EARTH_RADIUS_METERS = 6_371_008.8;
const SQUARE_METERS_PER_HECTARE = 10_000;
const MINIMUM_DISTINCT_POSITIONS = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function parsePosition(value: unknown): GeoJsonPosition {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !Number.isFinite(value[0]) ||
    !Number.isFinite(value[1])
  ) {
    throw new InvalidInputError(
      'polygon position must be a [longitude, latitude] pair',
    );
  }

  const longitude = value[0] as number;
  const latitude = value[1] as number;

  if (longitude < -180 || longitude > 180) {
    throw new InvalidInputError(
      'polygon longitude must be between -180 and 180',
    );
  }

  if (latitude < -90 || latitude > 90) {
    throw new InvalidInputError('polygon latitude must be between -90 and 90');
  }

  return [longitude, latitude];
}

function parseCoordinates(value: unknown): GeoJsonPosition[][] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new InvalidInputError(
      'polygon coordinates must be an array of linear rings',
    );
  }

  return value.map((ring) => {
    if (!Array.isArray(ring)) {
      throw new InvalidInputError(
        'polygon coordinates must be an array of linear rings',
      );
    }

    return ring.map((position) => parsePosition(position));
  });
}

function assertRingHasThreeDistinctPositions(ring: GeoJsonPosition[]): void {
  const distinct = new Set(ring.map(([longitude, latitude]) => `${longitude}:${latitude}`));

  if (distinct.size < MINIMUM_DISTINCT_POSITIONS) {
    throw new InvalidInputError(
      'polygon ring must contain at least 3 distinct positions',
    );
  }
}

function assertRingIsClosed(ring: GeoJsonPosition[]): void {
  const first = ring[0];
  const last = ring[ring.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    throw new InvalidInputError(
      'polygon ring must be closed: the first and last position must match',
    );
  }
}

function orientation(
  origin: GeoJsonPosition,
  first: GeoJsonPosition,
  second: GeoJsonPosition,
): number {
  return (
    (first[0] - origin[0]) * (second[1] - origin[1]) -
    (first[1] - origin[1]) * (second[0] - origin[0])
  );
}

/**
 * Only proper crossings count. Touching endpoints and collinear overlap are left
 * alone on purpose: adjacent edges share a vertex, and rejecting them would make
 * every ring invalid.
 */
function segmentsProperlyIntersect(
  firstStart: GeoJsonPosition,
  firstEnd: GeoJsonPosition,
  secondStart: GeoJsonPosition,
  secondEnd: GeoJsonPosition,
): boolean {
  const d1 = orientation(secondStart, secondEnd, firstStart);
  const d2 = orientation(secondStart, secondEnd, firstEnd);
  const d3 = orientation(firstStart, firstEnd, secondStart);
  const d4 = orientation(firstStart, firstEnd, secondEnd);

  const straddlesFirst = (d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0);
  const straddlesSecond = (d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0);

  return straddlesFirst && straddlesSecond;
}

function assertRingDoesNotSelfIntersect(ring: GeoJsonPosition[]): void {
  // The closing position repeats the first one, so it is not a distinct vertex.
  const positions = ring.slice(0, -1);
  const count = positions.length;

  for (let first = 0; first < count; first += 1) {
    for (let second = first + 1; second < count; second += 1) {
      const adjacent =
        (first + 1) % count === second || (second + 1) % count === first;

      if (adjacent) {
        continue;
      }

      if (
        segmentsProperlyIntersect(
          positions[first],
          positions[(first + 1) % count],
          positions[second],
          positions[(second + 1) % count],
        )
      ) {
        throw new InvalidInputError('polygon ring must not self-intersect');
      }
    }
  }
}

function ringSquareMeters(ring: GeoJsonPosition[]): number {
  let sum = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [longitude1, latitude1] = ring[index];
    const [longitude2, latitude2] = ring[index + 1];

    sum +=
      toRadians(longitude2 - longitude1) *
      (2 + Math.sin(toRadians(latitude1)) + Math.sin(toRadians(latitude2)));
  }

  return (sum * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2;
}

/**
 * A validated GeoJSON Polygon. Construction is the only way in, so an instance
 * always satisfies every rule of S9.
 */
export class LotPolygon {
  private constructor(private readonly rings: GeoJsonPosition[][]) {}

  static fromGeoJson(input: unknown): LotPolygon {
    if (!isRecord(input) || input.type !== 'Polygon') {
      throw new InvalidInputError('polygon must be a GeoJSON Polygon');
    }

    const rings = parseCoordinates(input.coordinates);

    for (const ring of rings) {
      assertRingHasThreeDistinctPositions(ring);
      assertRingIsClosed(ring);
    }

    for (const ring of rings) {
      assertRingDoesNotSelfIntersect(ring);
    }

    return new LotPolygon(rings);
  }

  toGeoJson(): GeoJsonPolygon {
    return {
      type: 'Polygon',
      coordinates: this.rings.map((ring) =>
        ring.map(([longitude, latitude]): GeoJsonPosition => [
          longitude,
          latitude,
        ]),
      ),
    };
  }

  /** Spherical excess over a spherical Earth, holes subtracted. */
  areaHectares(): number {
    const [exterior, ...holes] = this.rings;

    const squareMeters =
      Math.abs(ringSquareMeters(exterior)) -
      holes.reduce(
        (total, hole) => total + Math.abs(ringSquareMeters(hole)),
        0,
      );

    return squareMeters / SQUARE_METERS_PER_HECTARE;
  }
}
