import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as client from '../src/api/client.ts';
import {
  emptyExpenseForm,
  expenseChanges,
  expenseToForm,
  previewPayload,
  todayLocal,
  validateExpenseForm,
} from '../src/app/dashboard/finanzas/expense-form.ts';

const filled = {
  lotId: 'lot-1',
  categoryId: 'cat-1',
  date: '2026-11-20',
  description: ' Flete a Rosario ',
  amount: '90000',
  unit: 'ARS',
  grain: '',
};

const stored = {
  id: 'exp-1',
  lotId: 'lot-1',
  categoryId: 'cat-1',
  date: '2026-11-20T00:00:00.000Z',
  description: 'Flete',
  amount: '300.0000',
  unit: 'KG_CEREAL',
  grain: 'MAIZ',
};

test('the empty form starts on ARS with the given day', () => {
  assert.deepEqual(emptyExpenseForm('2026-11-23'), {
    lotId: '',
    categoryId: '',
    date: '2026-11-23',
    description: '',
    amount: '',
    unit: 'ARS',
    grain: '',
  });
});

test('a 90000 ARS Flete validates, trims the description and sends no grain', () => {
  const result = validateExpenseForm(filled);

  assert.equal(result.ok, true);
  assert.deepEqual(result.input, {
    lotId: 'lot-1',
    categoryId: 'cat-1',
    date: '2026-11-20',
    description: 'Flete a Rosario',
    amount: '90000',
    unit: 'ARS',
  });
});

test('300 kg of MAIZ keeps the grain and accepts a decimal comma', () => {
  const result = validateExpenseForm({ ...filled, amount: '300,5', unit: 'KG_CEREAL', grain: 'MAIZ' });

  assert.equal(result.ok, true);
  assert.equal(result.input.amount, '300.5');
  assert.equal(result.input.unit, 'KG_CEREAL');
  assert.equal(result.input.grain, 'MAIZ');
});

test('a leftover grain is never sent with a non-kilos unit', () => {
  const result = validateExpenseForm({ ...filled, unit: 'USD', grain: 'SOJA' });

  assert.equal(result.ok, true);
  assert.equal('grain' in result.input, false);
});

test('missing or invalid fields report an error per field', () => {
  const result = validateExpenseForm({
    lotId: '',
    categoryId: '',
    date: '20/11/2026',
    description: '   ',
    amount: '-5',
    unit: 'KG_CEREAL',
    grain: '',
  });

  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), [
    'amount',
    'categoryId',
    'date',
    'description',
    'grain',
    'lotId',
  ]);
});

test('zero is a valid amount and more than 4 decimals is not', () => {
  assert.equal(validateExpenseForm({ ...filled, amount: '0' }).ok, true);
  const result = validateExpenseForm({ ...filled, amount: '1.23456' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.amount);
});

test('an impossible calendar day is rejected', () => {
  assert.equal(validateExpenseForm({ ...filled, date: '2026-02-31' }).ok, false);
  assert.equal(validateExpenseForm({ ...filled, date: '2026-02-28' }).ok, true);
});

test('a stored expense loads into the form with a trimmed amount and a day-only date', () => {
  assert.deepEqual(expenseToForm(stored), {
    lotId: 'lot-1',
    categoryId: 'cat-1',
    date: '2026-11-20',
    description: 'Flete',
    amount: '300',
    unit: 'KG_CEREAL',
    grain: 'MAIZ',
  });
});

test('the preview payload carries only the money fields', () => {
  const result = validateExpenseForm({ ...filled, amount: '300', unit: 'KG_CEREAL', grain: 'MAIZ' });

  assert.deepEqual(previewPayload(result.input), { amount: '300', unit: 'KG_CEREAL', grain: 'MAIZ' });
  assert.deepEqual(previewPayload(validateExpenseForm(filled).input), { amount: '90000', unit: 'ARS' });
});

test('an unchanged form produces no changes', () => {
  const form = expenseToForm(stored);
  const result = validateExpenseForm(form);

  assert.equal(expenseChanges(stored, result.input), null);
});

test('editing only the category sends only the category (the valuation is kept server-side)', () => {
  const form = { ...expenseToForm(stored), categoryId: 'cat-2' };
  const result = validateExpenseForm(form);

  assert.deepEqual(expenseChanges(stored, result.input), { categoryId: 'cat-2' });
});

test('a numerically equal amount is not a change', () => {
  const form = { ...expenseToForm(stored), amount: '300.00' };

  assert.equal(expenseChanges(stored, validateExpenseForm(form).input), null);
});

test('changing the amount, the unit or the grain sends the whole money triplet', () => {
  const amount = validateExpenseForm({ ...expenseToForm(stored), amount: '400' });
  assert.deepEqual(expenseChanges(stored, amount.input), {
    amount: '400',
    unit: 'KG_CEREAL',
    grain: 'MAIZ',
  });

  const grain = validateExpenseForm({ ...expenseToForm(stored), grain: 'SOJA' });
  assert.deepEqual(expenseChanges(stored, grain.input), {
    amount: '300',
    unit: 'KG_CEREAL',
    grain: 'SOJA',
  });

  const unit = validateExpenseForm({ ...expenseToForm(stored), unit: 'ARS', grain: '' });
  assert.deepEqual(expenseChanges(stored, unit.input), { amount: '300', unit: 'ARS' });
});

test('lot, date and description changes are reported alongside', () => {
  const form = { ...expenseToForm(stored), lotId: 'lot-2', date: '2026-11-21', description: 'Otro' };

  assert.deepEqual(expenseChanges(stored, validateExpenseForm(form).input), {
    lotId: 'lot-2',
    date: '2026-11-21',
    description: 'Otro',
  });
});

test('today is the local calendar day, zero padded', () => {
  assert.equal(todayLocal(new Date(2026, 10, 3, 23, 59)), '2026-11-03');
  assert.equal(todayLocal(new Date(2026, 0, 31, 0, 1)), '2026-01-31');
});

/** Runs `call` against a fake fetch and returns what the client sent. */
async function sent(call, response = { ok: true }) {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), method: init.method, body: init.body });
    return new Response(JSON.stringify(response), { status: 200 });
  };
  try {
    await call();
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(requests.length, 1);
  const [request] = requests;
  return {
    method: request.method,
    path: request.url.replace(client.API_BASE, ''),
    body: request.body === undefined ? undefined : JSON.parse(request.body),
  };
}

test('the tariff functions keep their methods and paths', async () => {
  assert.deepEqual(await sent(() => client.getTariffs()), { method: 'GET', path: '/tariffs', body: undefined });
  assert.deepEqual(
    await sent(() => client.putTariff('l 1', { price: {}, cost: {} })),
    { method: 'PUT', path: '/tariffs/l%201', body: { price: {}, cost: {} } },
  );
  assert.deepEqual(await sent(() => client.deleteTariff('l1')), {
    method: 'DELETE',
    path: '/tariffs/l1',
    body: undefined,
  });
  assert.deepEqual(await sent(() => client.getTariffKgEquivalents('SOJA')), {
    method: 'GET',
    path: '/tariffs/kg-equivalents?grain=SOJA',
    body: undefined,
  });
});

test('the expense functions call the documented endpoints', async () => {
  const input = { lotId: 'l', categoryId: 'c', date: '2026-11-20', description: 'd', amount: '1', unit: 'ARS' };

  assert.deepEqual(await sent(() => client.getExpenses({ lotId: 'l1', from: '2026-07-01', categoryId: '' })), {
    method: 'GET',
    path: '/expenses?lotId=l1&from=2026-07-01',
    body: undefined,
  });
  assert.deepEqual(await sent(() => client.getExpenses()), { method: 'GET', path: '/expenses', body: undefined });
  assert.deepEqual(await sent(() => client.previewExpense({ amount: '1', unit: 'ARS' })), {
    method: 'POST',
    path: '/expenses/preview',
    body: { amount: '1', unit: 'ARS' },
  });
  assert.deepEqual(await sent(() => client.createExpense(input)), { method: 'POST', path: '/expenses', body: input });
  assert.deepEqual(await sent(() => client.updateExpense('e1', { amount: '2', unit: 'ARS' })), {
    method: 'PATCH',
    path: '/expenses/e1',
    body: { amount: '2', unit: 'ARS' },
  });
  assert.deepEqual(await sent(() => client.deleteExpense('e1')), {
    method: 'DELETE',
    path: '/expenses/e1',
    body: undefined,
  });
});

test('the category and suggestion functions call the documented endpoints', async () => {
  assert.deepEqual(await sent(() => client.getExpenseCategories()), {
    method: 'GET',
    path: '/expense-categories',
    body: undefined,
  });
  assert.deepEqual(await sent(() => client.createExpenseCategory('Flete')), {
    method: 'POST',
    path: '/expense-categories',
    body: { name: 'Flete' },
  });
  assert.deepEqual(await sent(() => client.updateExpenseCategory('c1', { active: false })), {
    method: 'PATCH',
    path: '/expense-categories/c1',
    body: { active: false },
  });
  assert.deepEqual(await sent(() => client.deleteExpenseCategory('c1')), {
    method: 'DELETE',
    path: '/expense-categories/c1',
    body: undefined,
  });
  assert.deepEqual(
    await sent(() => client.createExpenseSuggestion('e1', { kind: 'EDICION', changes: { amount: '5' } })),
    { method: 'POST', path: '/expenses/e1/suggestions', body: { kind: 'EDICION', amount: '5' } },
  );
  assert.deepEqual(await sent(() => client.createExpenseSuggestion('e1', { kind: 'BAJA' })), {
    method: 'POST',
    path: '/expenses/e1/suggestions',
    body: { kind: 'BAJA' },
  });
  assert.deepEqual(await sent(() => client.getExpenseSuggestions('PENDIENTE')), {
    method: 'GET',
    path: '/expense-suggestions?status=PENDIENTE',
    body: undefined,
  });
  assert.deepEqual(await sent(() => client.approveExpenseSuggestion('s1')), {
    method: 'POST',
    path: '/expense-suggestions/s1/approve',
    body: {},
  });
  assert.deepEqual(await sent(() => client.rejectExpenseSuggestion('s1', 'monto correcto')), {
    method: 'POST',
    path: '/expense-suggestions/s1/reject',
    body: { reason: 'monto correcto' },
  });
});
