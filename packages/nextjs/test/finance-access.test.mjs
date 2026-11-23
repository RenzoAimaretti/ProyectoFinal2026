import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canSeeCalculator,
  canManageExpenses,
  canResolveSuggestions,
  canSeeSuggestions,
  canSeeTariffs,
  defaultFinanceTab,
  expenseActions,
  visibleFinanceTabs,
} from '../src/app/dashboard/finanzas/access.ts';

const OTHER_ROLES = ['OPERARIO', 'PRODUCTOR', 'CONTRATISTA', 'VETERINARIO', 'INGENIERO', '', undefined, null];

test('only ADMIN sees the Tarifario tab', () => {
  assert.equal(canSeeTariffs('ADMIN'), true);
  for (const role of ['SUPERVISOR', ...OTHER_ROLES]) {
    assert.equal(canSeeTariffs(role), false, String(role));
  }
});

test('ADMIN sees every tab and lands on the Tarifario', () => {
  assert.deepEqual(visibleFinanceTabs('ADMIN'), ['tarifario', 'gastos', 'categorias', 'sugerencias', 'calculadora']);
  assert.equal(defaultFinanceTab('ADMIN'), 'tarifario');
});

test('SUPERVISOR sees Gastos, Categorias and Sugerencias but never the Tarifario', () => {
  assert.deepEqual(visibleFinanceTabs('SUPERVISOR'), ['gastos', 'categorias', 'sugerencias']);
  assert.equal(defaultFinanceTab('SUPERVISOR'), 'gastos');
  assert.equal(visibleFinanceTabs('SUPERVISOR').includes('tarifario'), false);
});

test('unknown or missing roles see no tab (fail closed)', () => {
  for (const role of [...OTHER_ROLES, 'ROOT']) {
    assert.deepEqual(visibleFinanceTabs(role), []);
    assert.equal(defaultFinanceTab(role), null);
  }
});

test('expenses, categories and suggestions are ADMIN and SUPERVISOR only', () => {
  for (const role of ['ADMIN', 'SUPERVISOR']) {
    assert.equal(canManageExpenses(role), true, role);
    assert.equal(canSeeSuggestions(role), true, role);
  }
  for (const role of OTHER_ROLES) {
    assert.equal(canManageExpenses(role), false, String(role));
    assert.equal(canSeeSuggestions(role), false, String(role));
  }
});

test('only ADMIN resolves suggestions', () => {
  assert.equal(canResolveSuggestions('ADMIN'), true);
  for (const role of ['SUPERVISOR', ...OTHER_ROLES]) {
    assert.equal(canResolveSuggestions(role), false, String(role));
  }
});

test('ADMIN edits and removes directly; SUPERVISOR only suggests', () => {
  assert.deepEqual(expenseActions('ADMIN', false), {
    edit: true,
    remove: true,
    suggestEdit: false,
    suggestRemove: false,
  });
  assert.deepEqual(expenseActions('SUPERVISOR', false), {
    edit: false,
    remove: false,
    suggestEdit: true,
    suggestRemove: true,
  });
});

test('an expense with a pending suggestion disables every action', () => {
  for (const role of ['ADMIN', 'SUPERVISOR']) {
    assert.deepEqual(expenseActions(role, true), {
      edit: false,
      remove: false,
      suggestEdit: false,
      suggestRemove: false,
    });
  }
});

test('other roles get no expense action at all', () => {
  for (const role of OTHER_ROLES) {
    assert.deepEqual(expenseActions(role, false), {
      edit: false,
      remove: false,
      suggestEdit: false,
      suggestRemove: false,
    });
  }
});

test('only ADMIN sees the Calculadora tab; SUPERVISOR and every other role never do', () => {
  assert.equal(canSeeCalculator('ADMIN'), true);
  for (const role of ['SUPERVISOR', ...OTHER_ROLES, 'ROOT']) {
    assert.equal(canSeeCalculator(role), false, String(role));
    assert.equal(visibleFinanceTabs(role).includes('calculadora'), false, String(role));
  }
});

test('adding the Calculadora keeps the SUPERVISOR tabs and the ADMIN landing tab unchanged', () => {
  assert.deepEqual(visibleFinanceTabs('SUPERVISOR'), ['gastos', 'categorias', 'sugerencias']);
  assert.equal(defaultFinanceTab('SUPERVISOR'), 'gastos');
  assert.equal(defaultFinanceTab('ADMIN'), 'tarifario');
});
