import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  boundsForPolygons,
  farmMapCenter,
  latLngsToPolygon,
  ringToLatLngs,
} from '../src/lib/lot-map.ts';

test('drawing converts Leaflet vertices to a closed GeoJSON ring without zero-length edges', () => {
  const polygon = latLngsToPolygon([
    [-33.4, -62.3],
    [-33.4, -62.3],
    [-33.4, -62.2],
    [-33.3, -62.2],
    [-33.3, -62.3],
    [-33.4, -62.3],
  ]);

  assert.deepEqual(polygon, {
    type: 'Polygon',
    coordinates: [[
      [-62.3, -33.4],
      [-62.2, -33.4],
      [-62.2, -33.3],
      [-62.3, -33.3],
      [-62.3, -33.4],
    ]],
  });
  assert.deepEqual(ringToLatLngs(polygon.coordinates[0])[0], [-33.4, -62.3]);
  assert.deepEqual(boundsForPolygons([polygon]), [[-33.4, -62.3], [-33.3, -62.2]]);
});

test('drawing rejects fewer than three distinct vertices and invalid coordinates', () => {
  assert.throws(
    () => latLngsToPolygon([[-33.4, -62.3], [-33.4, -62.3]]),
    { message: 'Marcá al menos tres puntos distintos para delimitar el lote.' },
  );
  assert.throws(
    () => latLngsToPolygon([[91, 0], [0, 0], [0, 1]]),
    { message: 'Las coordenadas deben ser latitud y longitud válidas.' },
  );
});

test('a farm center only uses valid numeric coordinates', () => {
  assert.deepEqual(farmMapCenter('-33.4, -62.3'), [-33.4, -62.3]);
  assert.equal(farmMapCenter('Campo Sur'), null);
  assert.equal(farmMapCenter('91, -62.3'), null);
});
