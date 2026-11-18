import { WeatherLocationUnresolvedError } from './errors';
import { centroidOfCoords } from './weather-location';

describe('centroidOfCoords', () => {
  it('averages a GeoJSON Polygon ring expressed as [lon, lat] pairs', () => {
    const coords = JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [-64.4, -33.1],
          [-64.3, -33.1],
          [-64.3, -33.2],
          [-64.4, -33.2],
          [-64.4, -33.1],
        ],
      ],
    });

    const centroid = centroidOfCoords(coords);

    expect(centroid.lat).toBeCloseTo(-33.15, 6);
    expect(centroid.lon).toBeCloseTo(-64.35, 6);
  });

  it('averages an array of pairs expressed as [lat, lon]', () => {
    const coords = JSON.stringify([
      [-33.1, -64.4],
      [-33.1, -64.3],
      [-33.2, -64.3],
      [-33.2, -64.4],
    ]);

    const centroid = centroidOfCoords(coords);

    expect(centroid.lat).toBeCloseTo(-33.15, 6);
    expect(centroid.lon).toBeCloseTo(-64.35, 6);
  });

  it('accepts a single vertex as a valid location', () => {
    expect(centroidOfCoords('[[-33.15,-64.35]]')).toEqual({
      lat: -33.15,
      lon: -64.35,
    });
  });

  it.each([
    '',
    '   ',
    'not-json',
    '[]',
    '{}',
    '{"type":"LineString","coordinates":[]}',
    '{"type":"Polygon","coordinates":[[]]}',
    '{"type":"Polygon","coordinates":[[[-64.35]]]}',
    '[[-33.15]]',
    '[[-33.15,"x"]]',
    '[[91,-64.35]]',
    '[[-33.15,181]]',
  ])(
    'rejects the invalid polygon %p instead of inventing a location',
    (coords) => {
      expect(() => centroidOfCoords(coords)).toThrow(
        WeatherLocationUnresolvedError,
      );
    },
  );
});
