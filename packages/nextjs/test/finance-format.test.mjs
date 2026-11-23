import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASIS_LABELS,
  GRAINS,
  GRAIN_LABELS,
  SUGGESTION_KIND_LABELS,
  SUGGESTION_STATUS_LABELS,
  USD_RATE_LABELS,
  buildExpenseConfirmation,
  describeProposedChanges,
  formatArs,
  formatDay,
  formatDecimal,
  formatKg,
  formatKgPerBasis,
  formatMoney,
  formatTariffComponent,
  formatValuedAt,
} from '../src/app/dashboard/finanzas/format.ts';
import {
  emptyTariffForm,
  tariffToForm,
  validateTariffForm,
} from '../src/app/dashboard/finanzas/tariff-form.ts';

test('decimal strings are grouped with es-AR separators without going through floats', () => {
  assert.equal(formatDecimal('186000', 2, 4), '186.000,00');
  assert.equal(formatDecimal('1234567.8900', 2, 4), '1.234.567,89');
  assert.equal(formatDecimal('0.1', 2, 4), '0,10');
  assert.equal(formatDecimal('99999999999999.9999', 2, 4), '99.999.999.999.999,9999');
});

test('rounding is half up and never shows more than the maximum decimals', () => {
  assert.equal(formatDecimal('1.005', 2, 2), '1,01');
  assert.equal(formatDecimal('2.5', 0, 0), '3');
  assert.equal(formatDecimal('0.00004', 2, 4), '0,00');
  assert.equal(formatDecimal('-1.005', 2, 2), '-1,01');
});

test('trailing zeros are trimmed down to the minimum decimals', () => {
  assert.equal(formatDecimal('12.0000', 0, 2), '12');
  assert.equal(formatDecimal('12.5000', 0, 2), '12,5');
  assert.equal(formatDecimal('8000.5000', 2, 4), '8.000,50');
});

test('missing or malformed values render as a dash, never as 0', () => {
  for (const value of [null, undefined, '', 'abc', '1,5']) {
    assert.equal(formatDecimal(value, 2, 2), '—');
    assert.equal(formatArs(value), '—');
    assert.equal(formatKg(value), '—');
  }
});

test('a real zero is shown as zero', () => {
  assert.equal(formatArs('0'), '$ 0,00');
  assert.equal(formatKg('0.00'), '0 kg');
});

test('ARS and kilos use their unit', () => {
  assert.equal(formatArs('186000.00'), '$ 186.000,00');
  assert.equal(formatKg('600.00'), '600 kg');
  assert.equal(formatKg('509.68'), '509,68 kg');
});

test('equivalents show kilos per basis or a dash when there is no price', () => {
  assert.equal(formatKgPerBasis('600.00', 'POR_HECTAREA'), '600 kg / ha');
  assert.equal(formatKgPerBasis('1.50', 'POR_HORA'), '1,5 kg / h');
  assert.equal(formatKgPerBasis(null, 'POR_HORA'), '—');
});

test('every grain of the board has a Spanish label', () => {
  assert.deepEqual(GRAINS, ['TRIGO', 'MAIZ', 'GIRASOL', 'SOJA', 'SORGO']);
  assert.equal(GRAIN_LABELS.SOJA, 'Soja');
  assert.equal(GRAIN_LABELS.MAIZ, 'Maíz');
  assert.equal(BASIS_LABELS.POR_HECTAREA, 'Por hectárea');
  assert.equal(BASIS_LABELS.POR_HORA, 'Por hora');
});

test('tariff components read as amount, unit and basis', () => {
  assert.equal(
    formatTariffComponent({ amount: '12.0000', unit: 'KG_CEREAL', grain: 'SOJA', basis: 'POR_HECTAREA' }),
    '12 kg de soja / ha',
  );
  assert.equal(
    formatTariffComponent({ amount: '8000.0000', unit: 'ARS', grain: null, basis: 'POR_HORA' }),
    '$ 8.000,00 / h',
  );
  assert.equal(
    formatTariffComponent({ amount: '100.0000', unit: 'USD', grain: null, basis: 'POR_HECTAREA' }),
    'US$ 100,00 / ha',
  );
  assert.equal(
    formatTariffComponent({ amount: '0.0000', unit: 'ARS', grain: null, basis: 'POR_HORA' }),
    '$ 0,00 / h',
  );
});

const filled = () => ({
  price: { amount: '12', unit: 'KG_CEREAL', grain: 'SOJA', basis: 'POR_HECTAREA' },
  cost: { amount: '8000', unit: 'ARS', grain: '', basis: 'POR_HORA' },
});

test('a complete form becomes the request body without the grain of non-kilo units', () => {
  const result = validateTariffForm(filled());

  assert.equal(result.ok, true);
  assert.deepEqual(result.input, {
    price: { amount: '12', unit: 'KG_CEREAL', grain: 'SOJA', basis: 'POR_HECTAREA' },
    cost: { amount: '8000', unit: 'ARS', basis: 'POR_HORA' },
  });
});

test('zero is a valid price and cost', () => {
  const form = filled();
  form.price = { amount: '0', unit: 'ARS', grain: '', basis: 'POR_HORA' };
  form.cost.amount = '0';

  assert.equal(validateTariffForm(form).ok, true);
});

test('price and cost are both required', () => {
  const form = filled();
  form.price.amount = '';
  form.cost.amount = '   ';

  const result = validateTariffForm(form);
  assert.equal(result.ok, false);
  assert.ok(result.errors.price);
  assert.ok(result.errors.cost);
});

test('kilos of cereal require a grain and other units must not send one', () => {
  const form = filled();
  form.price.grain = '';

  const result = validateTariffForm(form);
  assert.equal(result.ok, false);
  assert.match(result.errors.price, /grano/i);
  assert.equal(result.errors.cost, undefined);

  const withStaleGrain = filled();
  withStaleGrain.cost.grain = 'SOJA';
  const ok = validateTariffForm(withStaleGrain);
  assert.equal(ok.ok, true);
  assert.equal('grain' in ok.input.cost, false);
});

test('amounts accept a decimal comma but reject negatives, text and more than 4 decimals', () => {
  const comma = filled();
  comma.cost.amount = '8000,5';
  assert.equal(validateTariffForm(comma).input.cost.amount, '8000.5');

  for (const amount of ['-1', 'abc', '1.00001', '1e3', '1.2.3']) {
    const form = filled();
    form.cost.amount = amount;
    assert.equal(validateTariffForm(form).ok, false, amount);
  }
});

test('an existing tariff fills the form with trimmed amounts and an empty grain for ARS', () => {
  const form = tariffToForm({
    id: 't1',
    laborTypeId: 'l1',
    price: { amount: '12.0000', unit: 'KG_CEREAL', grain: 'SOJA', basis: 'POR_HECTAREA' },
    cost: { amount: '8000.5000', unit: 'ARS', grain: null, basis: 'POR_HORA' },
    updatedBy: 'u',
    createdAt: '2026-11-23T00:00:00.000Z',
    updatedAt: '2026-11-23T00:00:00.000Z',
  });

  assert.deepEqual(form, {
    price: { amount: '12', unit: 'KG_CEREAL', grain: 'SOJA', basis: 'POR_HECTAREA' },
    cost: { amount: '8000.5', unit: 'ARS', grain: '', basis: 'POR_HORA' },
  });
});

test('the empty form starts in ARS per hectare with no amounts', () => {
  const form = emptyTariffForm();

  assert.equal(form.price.amount, '');
  assert.equal(form.price.unit, 'ARS');
  assert.equal(form.price.basis, 'POR_HECTAREA');
  assert.equal(validateTariffForm(form).ok, false);
});

test('money reads in its own unit: pesos, dollars or kilos of a grain', () => {
  assert.equal(formatMoney('90000.0000', 'ARS', null), '$ 90.000,00');
  assert.equal(formatMoney('10', 'USD', null), 'US$ 10,00');
  assert.equal(formatMoney('300.0000', 'KG_CEREAL', 'MAIZ'), '300 kg de maíz');
  assert.equal(formatMoney(null, 'ARS', null), '—');
});

test('days come from the stored UTC day and never shift with the local zone', () => {
  assert.equal(formatDay('2026-11-20T00:00:00.000Z'), '20/11/2026');
  assert.equal(formatDay('2026-11-20'), '20/11/2026');
  assert.equal(formatDay(null), '—');
  assert.equal(formatDay('basura'), '—');
});

test('the valuation moment is shown in Argentina time', () => {
  assert.equal(formatValuedAt('2026-11-23T12:00:00.000Z'), '23/11/2026 09:00');
  assert.equal(formatValuedAt('2026-11-23T02:30:00.000Z'), '22/11/2026 23:30');
  assert.equal(formatValuedAt(undefined), '—');
});

const preview = (patch = {}) => ({
  amount: '300',
  unit: 'KG_CEREAL',
  grain: 'MAIZ',
  amountArs: '58500.00',
  grainArsPerTon: '195000',
  usdRate: null,
  usdRateType: null,
  priceSource: 'cac.bcr.com.ar',
  priceFetchedAt: '2026-11-23T11:55:00.000Z',
  priceStale: false,
  valuedAt: '2026-11-23T12:00:00.000Z',
  ...patch,
});

const typed = {
  lotId: 'lot-1',
  categoryId: 'cat-1',
  date: '2026-11-20',
  description: 'Flete',
  amount: '300',
  unit: 'KG_CEREAL',
  grain: 'MAIZ',
};

test('the confirmation summary shows 300 kg of maiz valued at 58.500 ARS with price, source and date', () => {
  const summary = buildExpenseConfirmation({
    lotName: 'Lote N°1',
    categoryName: 'Flete',
    input: typed,
    preview: preview(),
  });

  assert.deepEqual(summary.rows, [
    { label: 'Lote', value: 'Lote N°1' },
    { label: 'Categoría', value: 'Flete' },
    { label: 'Fecha del gasto', value: '20/11/2026' },
    { label: 'Descripción', value: 'Flete' },
    { label: 'Monto cargado', value: '300 kg de maíz' },
    { label: 'Valor en pesos', value: '$ 58.500,00' },
    { label: 'Precio utilizado', value: '$ 195.000,00 por tonelada de maíz' },
    { label: 'Fuente', value: 'cac.bcr.com.ar' },
    { label: 'Valorizado el', value: '23/11/2026 09:00' },
  ]);
  assert.equal(summary.stale, false);
});

test('a USD expense names the rate and its type; an ARS expense has no price rows', () => {
  const usd = buildExpenseConfirmation({
    lotName: 'L',
    categoryName: 'C',
    input: { ...typed, amount: '10', unit: 'USD', grain: undefined },
    preview: preview({
      amount: '10',
      unit: 'USD',
      grain: null,
      amountArs: '10000.00',
      grainArsPerTon: null,
      usdRate: '1000',
      usdRateType: 'OFICIAL_VENTA',
      priceSource: 'dolarapi.com',
    }),
  });
  const labels = usd.rows.map((row) => row.label);
  assert.deepEqual(usd.rows.find((row) => row.label === 'Monto cargado'), {
    label: 'Monto cargado',
    value: 'US$ 10,00',
  });
  assert.deepEqual(usd.rows.find((row) => row.label === 'Precio utilizado'), {
    label: 'Precio utilizado',
    value: '$ 1.000,00 por dólar (oficial venta)',
  });
  assert.ok(labels.includes('Fuente'));

  const ars = buildExpenseConfirmation({
    lotName: 'L',
    categoryName: 'C',
    input: { ...typed, amount: '90000', unit: 'ARS', grain: undefined },
    preview: preview({
      amount: '90000',
      unit: 'ARS',
      grain: null,
      amountArs: '90000.00',
      grainArsPerTon: null,
      priceSource: null,
    }),
  });
  const arsLabels = ars.rows.map((row) => row.label);
  assert.equal(arsLabels.includes('Precio utilizado'), false);
  assert.equal(arsLabels.includes('Fuente'), false);
  assert.deepEqual(ars.rows.find((row) => row.label === 'Valor en pesos'), {
    label: 'Valor en pesos',
    value: '$ 90.000,00',
  });
});

test('a stale price is flagged so the user can decide before saving', () => {
  const summary = buildExpenseConfirmation({
    lotName: 'L',
    categoryName: 'C',
    input: typed,
    preview: preview({ priceStale: true }),
  });

  assert.equal(summary.stale, true);
});

const names = {
  lot: (id) => `Lote ${id}`,
  category: (id) => `Cat ${id}`,
};
const suggestionOf = (kind, proposed = {}) => ({
  kind,
  proposed: {
    lotId: null,
    categoryId: null,
    date: null,
    description: null,
    amount: null,
    unit: null,
    grain: null,
    ...proposed,
  },
  expense: {
    amount: '300.0000',
    unit: 'KG_CEREAL',
    grain: 'MAIZ',
  },
});

test('a removal suggestion reads as a single line', () => {
  assert.deepEqual(describeProposedChanges(suggestionOf('BAJA'), names), [
    { label: 'Propuesta', value: 'Dar de baja el gasto' },
  ]);
});

test('an edition lists only the proposed fields', () => {
  const rows = describeProposedChanges(
    suggestionOf('EDICION', { categoryId: 'c2', description: 'Otro', date: '2026-11-21T00:00:00.000Z' }),
    names,
  );

  assert.deepEqual(rows, [
    { label: 'Categoría', value: 'Cat c2' },
    { label: 'Fecha', value: '21/11/2026' },
    { label: 'Descripción', value: 'Otro' },
  ]);
});

test('a proposed amount borrows the unit and grain of the expense when they are not proposed', () => {
  const amountOnly = describeProposedChanges(suggestionOf('EDICION', { amount: '500.0000' }), names);
  assert.deepEqual(amountOnly, [{ label: 'Monto', value: '500 kg de maíz' }]);

  const toArs = describeProposedChanges(suggestionOf('EDICION', { unit: 'ARS' }), names);
  assert.deepEqual(toArs, [{ label: 'Monto', value: '$ 300,00' }]);

  const grain = describeProposedChanges(suggestionOf('EDICION', { grain: 'SOJA' }), names);
  assert.deepEqual(grain, [{ label: 'Monto', value: '300 kg de soja' }]);
});

test('suggestions and rates have Spanish labels', () => {
  assert.equal(SUGGESTION_KIND_LABELS.EDICION, 'Edición');
  assert.equal(SUGGESTION_KIND_LABELS.BAJA, 'Baja');
  assert.equal(SUGGESTION_STATUS_LABELS.PENDIENTE, 'Pendiente');
  assert.equal(SUGGESTION_STATUS_LABELS.APROBADA, 'Aprobada');
  assert.equal(SUGGESTION_STATUS_LABELS.RECHAZADA, 'Rechazada');
  assert.equal(USD_RATE_LABELS.OFICIAL_VENTA, 'oficial venta');
});
