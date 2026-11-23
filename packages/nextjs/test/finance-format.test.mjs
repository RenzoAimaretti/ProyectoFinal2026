import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASIS_LABELS,
  GRAINS,
  GRAIN_LABELS,
  formatArs,
  formatDecimal,
  formatKg,
  formatKgPerBasis,
  formatTariffComponent,
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
