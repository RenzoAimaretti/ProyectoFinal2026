import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  boundsForPolygons,
  farmMapCenter,
  latLngsToPolygon,
  ringToLatLngs,
  removeDraftVertex,
  distinctDraftVertexCount,
  LOT_COLOR_FALLBACK,
  LOT_EMPHASIS_COLOR_VAR,
  LOT_STATE_COLOR_VARS,
  LOT_STATES,
  resolveColorTokens,
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
  assert.ok(
    globals.includes(`${LOT_EMPHASIS_COLOR_VAR}:`),
    `the selection colour ${LOT_EMPHASIS_COLOR_VAR} must be defined in globals.css`,
  );
});

// Leaflet paints whatever string it is handed, so an unresolved token must degrade to a
// paintable value rather than to undefined, which silently removes the colour.
test('every map colour resolves, including the selection colour, and never to nothing', () => {
  const names = [
    ...LOT_STATES.map((state) => LOT_STATE_COLOR_VARS[state]),
    LOT_EMPHASIS_COLOR_VAR,
  ];

  const resolved = resolveColorTokens(names, (name) =>
    name === LOT_STATE_COLOR_VARS.sembrado ? '  #3a7d44  ' : '',
  );

  assert.equal(resolved[LOT_STATE_COLOR_VARS.sembrado], '#3a7d44', 'a real token value is trimmed and kept');
  for (const name of names) {
    assert.ok(resolved[name], `${name} must resolve to a paintable colour, never to undefined`);
  }
  assert.equal(resolved[LOT_EMPHASIS_COLOR_VAR], LOT_COLOR_FALLBACK);
  assert.notEqual(
    resolved[LOT_STATE_COLOR_VARS.sembrado],
    resolved[LOT_EMPHASIS_COLOR_VAR],
    'a missing selection token must not become the colour it is meant to stand out from',
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
