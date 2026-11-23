import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as client from '../src/api/client.ts';
import {
  describePendingBanner,
  formatMarginArs,
  formatProfitability,
} from '../src/app/dashboard/finanzas/format.ts';
import {
  MODES,
  MODE_LABELS,
  SORT_COLUMNS,
  calculatorErrorMessage,
  nextSort,
  sortRows,
} from '../src/app/dashboard/finanzas/metrics.ts';

function row(id, overrides = {}) {
  return {
    lotId: id,
    lotName: `Lote ${id}`,
    farmName: 'Campo',
    clientName: 'Cliente',
    areaHa: '100.0000',
    incomeArs: '0.00',
    costArs: '0.00',
    marginArs: '0.00',
    marginPerHaArs: '0.00',
    profitability: null,
    ...overrides,
  };
}

const ids = (rows) => rows.map((r) => r.lotId);

test('every column of the table can be sorted', () => {
  assert.deepEqual(SORT_COLUMNS, [
    'field',
    'client',
    'area',
    'income',
    'cost',
    'margin',
    'marginPerHa',
    'profitability',
  ]);
});

test('sorts numeric columns by exact decimal value, ascending and descending', () => {
  const rows = [
    row('a', { incomeArs: '1000.00' }),
    row('b', { incomeArs: '9.00' }),
    row('c', { incomeArs: '100.50' }),
  ];
  assert.deepEqual(ids(sortRows(rows, { column: 'income', direction: 'asc' })), ['b', 'c', 'a']);
  assert.deepEqual(ids(sortRows(rows, { column: 'income', direction: 'desc' })), ['a', 'c', 'b']);
});

test('compares large decimals exactly, without binary floats', () => {
  const rows = [
    row('a', { marginArs: '1000000000000000.02' }),
    row('b', { marginArs: '1000000000000000.01' }),
  ];
  assert.deepEqual(ids(sortRows(rows, { column: 'margin', direction: 'asc' })), ['b', 'a']);
});

test('negative values sort below positive ones', () => {
  const rows = [row('a', { marginArs: '50.00' }), row('b', { marginArs: '-8000.00' }), row('c', { marginArs: '0.00' })];
  assert.deepEqual(ids(sortRows(rows, { column: 'margin', direction: 'asc' })), ['b', 'c', 'a']);
});

test('nulls go last in both directions', () => {
  const rows = [
    row('a', { profitability: null }),
    row('b', { profitability: '2.0000' }),
    row('c', { profitability: '-1.0000' }),
    row('d', { profitability: null }),
  ];
  assert.deepEqual(ids(sortRows(rows, { column: 'profitability', direction: 'asc' })), ['c', 'b', 'a', 'd']);
  assert.deepEqual(ids(sortRows(rows, { column: 'profitability', direction: 'desc' })), ['b', 'c', 'a', 'd']);
});

test('is stable: equal keys keep their original order, also when descending', () => {
  const rows = [row('a'), row('b'), row('c')];
  assert.deepEqual(ids(sortRows(rows, { column: 'income', direction: 'asc' })), ['a', 'b', 'c']);
  assert.deepEqual(ids(sortRows(rows, { column: 'income', direction: 'desc' })), ['a', 'b', 'c']);
});

test('sorts text columns alphabetically ignoring case and accents; field sorts by farm then lot', () => {
  const rows = [
    row('a', { clientName: 'zeta', farmName: 'Verde', lotName: 'B' }),
    row('b', { clientName: 'Álamo', farmName: 'Agro', lotName: 'Z' }),
    row('c', { clientName: 'beta', farmName: 'Agro', lotName: 'A' }),
  ];
  assert.deepEqual(ids(sortRows(rows, { column: 'client', direction: 'asc' })), ['b', 'c', 'a']);
  assert.deepEqual(ids(sortRows(rows, { column: 'field', direction: 'asc' })), ['c', 'b', 'a']);
});

test('does not mutate its input', () => {
  const rows = [row('a', { incomeArs: '2.00' }), row('b', { incomeArs: '1.00' })];
  sortRows(rows, { column: 'income', direction: 'asc' });
  assert.deepEqual(ids(rows), ['a', 'b']);
});

test('clicking a column sorts it ascending, then flips, and a new column starts ascending', () => {
  assert.deepEqual(nextSort(null, 'income'), { column: 'income', direction: 'asc' });
  assert.deepEqual(nextSort({ column: 'income', direction: 'asc' }, 'income'), { column: 'income', direction: 'desc' });
  assert.deepEqual(nextSort({ column: 'income', direction: 'desc' }, 'income'), { column: 'income', direction: 'asc' });
  assert.deepEqual(nextSort({ column: 'income', direction: 'desc' }, 'cost'), { column: 'cost', direction: 'asc' });
});

test('negative margins carry a sign, positive ones do not, and a missing value is a dash', () => {
  assert.equal(formatMarginArs('-8000.00'), '-$ 8.000,00');
  assert.equal(formatMarginArs('400000.00'), '$ 400.000,00');
  assert.equal(formatMarginArs('0.00'), '$ 0,00');
  assert.equal(formatMarginArs(null), '—');
  assert.equal(formatMarginArs(undefined), '—');
});

test('profitability is a percentage and "—" when it is null (cost 0)', () => {
  assert.equal(formatProfitability('2.0000'), '200 %');
  assert.equal(formatProfitability('0.0333'), '3,3 %');
  assert.equal(formatProfitability('-1.0000'), '-100 %');
  assert.equal(formatProfitability('0.0000'), '0 %');
  assert.equal(formatProfitability(null), '—');
  assert.equal(formatProfitability(undefined), '—');
});

test('the pending banner reports reports and hectares, and is hidden when nothing is pending', () => {
  assert.equal(describePendingBanner({ reports: 0, hectares: '0.0000' }), null);
  assert.equal(
    describePendingBanner({ reports: 3, hectares: '120.0000' }),
    '3 partes aprobados sin valorizar (120 ha). Se valorizan cuando exista una tarifa para su labor.',
  );
  assert.equal(
    describePendingBanner({ reports: 1, hectares: '12.5000' }),
    '1 parte aprobado sin valorizar (12,5 ha). Se valoriza cuando exista una tarifa para su labor.',
  );
});

test('the toggle offers "Al aprobar" and "A valor de hoy"', () => {
  assert.deepEqual(MODES, ['AL_APROBAR', 'A_VALOR_HOY']);
  assert.equal(MODE_LABELS.AL_APROBAR, 'Al aprobar');
  assert.equal(MODE_LABELS.A_VALOR_HOY, 'A valor de hoy');
});

test('a 503 in "A valor de hoy" explains the missing market price and points to "Al aprobar"', () => {
  const message = calculatorErrorMessage(503, 'A_VALOR_HOY');
  assert.match(message, /precio de hoy/);
  assert.match(message, /Al aprobar/);
});

test('other failures keep a clear message', () => {
  assert.match(calculatorErrorMessage(503, 'AL_APROBAR'), /no está disponible/);
  assert.match(calculatorErrorMessage(403, 'AL_APROBAR'), /permisos/);
  assert.match(calculatorErrorMessage(401, 'AL_APROBAR'), /sesión/);
  assert.match(calculatorErrorMessage(400, 'AL_APROBAR'), /filtros/);
  assert.match(calculatorErrorMessage(500, 'AL_APROBAR'), /500/);
  assert.match(calculatorErrorMessage(null, 'AL_APROBAR'), /inesperado/);
});

async function sent(call, response = {}) {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), method: init.method });
    return new Response(JSON.stringify(response), { status: 200 });
  };
  try {
    await call();
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(requests.length, 1);
  return { method: requests[0].method, path: requests[0].url.replace(client.API_BASE, '') };
}

test('the calculator functions send the campaign or the range, and the mode', async () => {
  assert.deepEqual(await sent(() => client.getLotProfitability({ campaign: '2025/26' }, 'AL_APROBAR')), {
    method: 'GET',
    path: '/profitability/lots?campaign=2025%2F26&mode=AL_APROBAR',
  });
  assert.deepEqual(
    await sent(() => client.getLotProfitability({ from: '2026-01-01', to: '2026-03-31' }, 'A_VALOR_HOY')),
    { method: 'GET', path: '/profitability/lots?from=2026-01-01&to=2026-03-31&mode=A_VALOR_HOY' },
  );
});

test('the lot detail keeps the same filters and encodes the lot id', async () => {
  assert.deepEqual(await sent(() => client.getLotProfitabilityDetail('lot 1', { campaign: '2025/26' }, 'A_VALOR_HOY')), {
    method: 'GET',
    path: '/profitability/lots/lot%201?campaign=2025%2F26&mode=A_VALOR_HOY',
  });
});

test('the calculator functions never send a company id', async () => {
  const { path } = await sent(() => client.getLotProfitability({ campaign: '2025/26' }, 'AL_APROBAR'));
  assert.equal(path.includes('companyId'), false);
});

test('the existing tariff function keeps its method and path', async () => {
  assert.deepEqual(await sent(() => client.getTariffs()), { method: 'GET', path: '/tariffs' });
});
