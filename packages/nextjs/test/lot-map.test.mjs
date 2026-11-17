import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  boundsForPolygons,
  farmMapCenter,
  latLngsToPolygon,
  ringToLatLngs,
  removeDraftVertex,
  distinctDraftVertexCount,
  LOT_STATE_COLOR_VARS,
  LOT_STATES,
} from '../src/lib/lot-map.ts';
import { readFileSync } from 'node:fs';

// The map must paint from the design system, not from a second copy of the palette:
// a renamed token has to break this test instead of silently greying out a field.
test('each lot state paints from a design token that globals.css actually defines', () => {
  const globals = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

  for (const state of LOT_STATES) {
    const token = LOT_STATE_COLOR_VARS[state];
    assert.ok(token, `${state} must name a colour token`);
    assert.match(token, /^--color-agro-[a-z-]+$/, `${state} must name a token, not a literal colour`);
    assert.ok(
      globals.includes(`${token}:`),
      `token ${token} used by ${state} must be defined in globals.css`,
    );
  }

  assert.equal(
    new Set(Object.values(LOT_STATE_COLOR_VARS)).size,
    LOT_STATES.length,
    'each state keeps a distinct colour so the legend stays readable',
  );
});

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

test('removing a chosen draft vertex preserves order and never changes the original', () => {
  const stored = [[0, 0], [0, 1], [1, 1], [1, 0]];
  const three = removeDraftVertex(stored, 1);
  assert.deepEqual(three, [[0, 0], [1, 1], [1, 0]]);
  assert.deepEqual(stored, [[0, 0], [0, 1], [1, 1], [1, 0]]);
  const two = removeDraftVertex(three, 0);
  assert.deepEqual(two, [[1, 1], [1, 0]]);
  assert.equal(distinctDraftVertexCount(two), 2);
  assert.throws(() => latLngsToPolygon(two), { message: 'Marcá al menos tres puntos distintos para delimitar el lote.' });
  assert.equal(distinctDraftVertexCount([[0, 0], [0, 0], [1, 1]]), 2);
  assert.equal(distinctDraftVertexCount(three), 3);
  assert.deepEqual(latLngsToPolygon(three).coordinates[0][0], [0, 0]);
});

test('a farm center only uses valid numeric coordinates', () => {
  assert.deepEqual(farmMapCenter('-33.4, -62.3'), [-33.4, -62.3]);
  assert.equal(farmMapCenter('Campo Sur'), null);
  assert.equal(farmMapCenter('91, -62.3'), null);
});
