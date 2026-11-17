import { InvalidInputError } from './errors';
import { LotPolygon } from './lot-polygon';

const closedSquare = {
  type: 'Polygon',
  coordinates: [
    [
      [-62.3, -33.4],
      [-62.2, -33.4],
      [-62.2, -33.3],
      [-62.3, -33.3],
      [-62.3, -33.4],
    ],
  ],
};

/** Concave but simple: must be accepted, so the self-intersection rule is not over-eager. */
const concaveRing = [
  [0, 0],
  [4, 0],
  [4, 4],
  [3, 4],
  [3, 1],
  [1, 1],
  [1, 4],
  [0, 4],
  [0, 0],
];

/** A bow-tie: four distinct positions, closed, in range, and properly crossing. */
const bowTieRing = [
  [0, 0],
  [2, 2],
  [2, 0],
  [0, 2],
  [0, 0],
];

/**
 * Pinched: edges (4,4)-(2,4) and (2,4)-(0,4) are not adjacent and both end on
 * the shared vertex (2,4). No edge properly crosses another, so only a
 * contact-aware test rejects it.
 */
const pinchedRing = [
  [0, 0],
  [4, 0],
  [4, 4],
  [2, 4],
  [2, 2],
  [2, 4],
  [0, 4],
  [0, 0],
];

/**
 * Overlapping: edges (4,4)-(1,4) and (2,4)-(0,4) are collinear and share the
 * span from (1,4) to (2,4). Every orientation is zero.
 */
const overlappingRing = [
  [0, 0],
  [4, 0],
  [4, 4],
  [1, 4],
  [2, 4],
  [0, 4],
  [0, 0],
];

const EARTH_RADIUS_METERS = 6_371_008.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Exact area of a spherical cell bounded by two meridians and two parallels.
 * The trapezoid sum the value object uses is exact for this shape, so the
 * comparison below is against an independent reference rather than a number
 * derived from the implementation. The tolerance is `toBeCloseTo`'s, not the
 * formula's: the two do agree to floating-point precision.
 */
function sphericalCellHectares(
  latitude1: number,
  latitude2: number,
  longitudeSpanDegrees: number,
): number {
  const squareMeters =
    EARTH_RADIUS_METERS ** 2 *
    toRadians(longitudeSpanDegrees) *
    (Math.sin(toRadians(latitude2)) - Math.sin(toRadians(latitude1)));

  return squareMeters / 10_000;
}

function rejectionMessage(input: unknown): string {
  try {
    LotPolygon.fromGeoJson(input);
  } catch (error) {
    if (!(error instanceof InvalidInputError)) {
      throw new Error(
        `expected InvalidInputError, received ${String(error)} for ${JSON.stringify(input)}`,
      );
    }

    return (error as Error).message;
  }

  throw new Error(`expected a rejection for ${JSON.stringify(input)}`);
}

function rejectionForCoordinates(coordinates: unknown): string {
  return rejectionMessage({ type: 'Polygon', coordinates });
}

function fromCoordinates(coordinates: unknown) {
  return () => LotPolygon.fromGeoJson({ type: 'Polygon', coordinates });
}

describe('LotPolygon domain rules', () => {
  it('accepts a closed square and returns the same GeoJSON', () => {
    expect(LotPolygon.fromGeoJson(closedSquare).toGeoJson()).toEqual(
      closedSquare,
    );
  });

  it('accepts a concave ring that does not self-intersect', () => {
    expect(fromCoordinates([concaveRing])).not.toThrow();
  });

  it('accepts a polygon that carries a hole', () => {
    const withHole = [
      concaveRing,
      [
        [1, 2],
        [2, 2],
        [2, 3],
        [1, 3],
        [1, 2],
      ],
    ];

    expect(fromCoordinates(withHole)).not.toThrow();
  });

  it('accepts positions sitting exactly on the coordinate range boundaries', () => {
    expect(
      fromCoordinates([
        [
          [180, 0],
          [179, 0],
          [179, 1],
          [180, 1],
          [180, 0],
        ],
      ]),
    ).not.toThrow();
  });

  it.each([
    ['a string', 'x'],
    ['a number', 7],
    ['null', null],
    ['undefined', undefined],
    ['an array', []],
    ['an object without a type', { coordinates: [] }],
    ['a different geometry type', { type: 'Point', coordinates: [0, 0] }],
    ['a Feature wrapper', { type: 'Feature', geometry: closedSquare }],
    [
      'a lowercase polygon type',
      { type: 'polygon', coordinates: closedSquare.coordinates },
    ],
  ])('rejects %s with the exact message', (_label, input) => {
    expect(rejectionMessage(input)).toBe('polygon must be a GeoJSON Polygon');
  });

  it.each([
    ['a missing coordinates member', { type: 'Polygon' }],
    ['a string coordinates member', { type: 'Polygon', coordinates: 'x' }],
    ['an object coordinates member', { type: 'Polygon', coordinates: {} }],
    ['an empty ring list', { type: 'Polygon', coordinates: [] }],
    ['a ring that is not an array', { type: 'Polygon', coordinates: [0, 0] }],
    [
      'a ring element that is not a ring',
      { type: 'Polygon', coordinates: [[[0, 0]], 0] },
    ],
  ])('rejects %s with the exact message', (_label, input) => {
    expect(rejectionMessage(input)).toBe(
      'polygon coordinates must be an array of linear rings',
    );
  });

  it.each([
    [
      'a position with a single member',
      [
        [
          [0, 0],
          [1],
          [1, 1],
          [0, 0],
        ],
      ],
    ],
    [
      'a position with a non-numeric latitude',
      [
        [
          [0, 0],
          [1, 'a'],
          [1, 1],
          [0, 0],
        ],
      ],
    ],
    [
      'a position with a NaN member',
      [
        [
          [0, 0],
          [1, Number.NaN],
          [1, 1],
          [0, 0],
        ],
      ],
    ],
    [
      'a position that is not an array',
      [
        [
          [0, 0],
          1,
          [1, 1],
          [0, 0],
        ],
      ],
    ],
  ])('rejects %s with the exact message', (_label, coordinates) => {
    expect(rejectionForCoordinates(coordinates)).toBe(
      'polygon position must be a [longitude, latitude] pair',
    );
  });

  it.each([
    [
      'a longitude above 180',
      [
        [
          [0, 0],
          [1, 0],
          [180.0001, 1],
          [0, 0],
        ],
      ],
    ],
    [
      'a longitude below -180',
      [
        [
          [0, 0],
          [1, 0],
          [-180.0001, 1],
          [0, 0],
        ],
      ],
    ],
  ])('rejects %s with the exact message', (_label, coordinates) => {
    expect(rejectionForCoordinates(coordinates)).toBe(
      'polygon longitude must be between -180 and 180',
    );
  });

  it.each([
    [
      'a latitude above 90',
      [
        [
          [0, 0],
          [1, 0],
          [1, 90.0001],
          [0, 0],
        ],
      ],
    ],
    [
      'a latitude below -90',
      [
        [
          [0, 0],
          [1, 0],
          [1, -90.0001],
          [0, 0],
        ],
      ],
    ],
  ])('rejects %s with the exact message', (_label, coordinates) => {
    expect(rejectionForCoordinates(coordinates)).toBe(
      'polygon latitude must be between -90 and 90',
    );
  });

  it.each([
    [
      'a ring with only two distinct positions',
      [
        [
          [0, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    ],
    [
      'a ring that repeats one position',
      [
        [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      ],
    ],
  ])('rejects %s with the exact message', (_label, coordinates) => {
    expect(rejectionForCoordinates(coordinates)).toBe(
      'polygon ring must contain at least 3 distinct positions',
    );
  });

  it('rejects a ring that repeats a position consecutively', () => {
    // The zero-length edge (1,0)-(1,0) is adjacent to both edges it meets, so
    // only an explicit rule can catch it.
    expect(
      rejectionForCoordinates([
        [
          [0, 0],
          [1, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ]),
    ).toBe('polygon ring must not repeat a position consecutively');
  });

  it('still reports the weaker distinct-position rule first', () => {
    expect(
      rejectionForCoordinates([
        [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      ]),
    ).toBe('polygon ring must contain at least 3 distinct positions');
  });

  it('rejects a ring whose first and last positions differ', () => {
    expect(
      rejectionForCoordinates([
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ]),
    ).toBe(
      'polygon ring must be closed: the first and last position must match',
    );
  });

  it.each([
    ['a properly crossing ring', bowTieRing],
    ['a ring pinched at a shared vertex', pinchedRing],
    ['a ring with a collinear overlap', overlappingRing],
  ])('rejects %s with the exact message', (_label, ring) => {
    expect(rejectionForCoordinates([ring])).toBe(
      'polygon ring must not self-intersect',
    );
  });

  it('rejects a hole that self-intersects', () => {
    expect(rejectionForCoordinates([concaveRing, bowTieRing])).toBe(
      'polygon ring must not self-intersect',
    );
  });

  it('matches the closed-form area of a spherical cell', () => {
    const expected = sphericalCellHectares(-33.4, -33.3, 0.1);

    expect(LotPolygon.fromGeoJson(closedSquare).areaHectares()).toBeCloseTo(
      expected,
      2,
    );
  });

  it('reports the same area for a ring wound the other way round', () => {
    const forward = LotPolygon.fromGeoJson(closedSquare).areaHectares();
    const reversed = LotPolygon.fromGeoJson({
      type: 'Polygon',
      coordinates: [[...closedSquare.coordinates[0]].reverse()],
    }).areaHectares();

    expect(reversed).toBeCloseTo(forward, 6);
  });

  it('subtracts the area of a hole', () => {
    const outer = LotPolygon.fromGeoJson(closedSquare).areaHectares();
    const holed = LotPolygon.fromGeoJson({
      type: 'Polygon',
      coordinates: [
        closedSquare.coordinates[0],
        [
          [-62.28, -33.38],
          [-62.22, -33.38],
          [-62.22, -33.32],
          [-62.28, -33.32],
          [-62.28, -33.38],
        ],
      ],
    }).areaHectares();

    // The hole is a 0.06° x 0.06° spherical cell inside the square.
    expect(holed).toBeCloseTo(
      outer - sphericalCellHectares(-33.38, -33.32, 0.06),
      2,
    );
    expect(holed).toBeLessThan(outer);
  });

  it('round-trips through GeoJSON without changing the geometry', () => {
    const once = LotPolygon.fromGeoJson(closedSquare);
    const twice = LotPolygon.fromGeoJson(once.toGeoJson());

    expect(twice.toGeoJson()).toEqual(once.toGeoJson());
  });
});
