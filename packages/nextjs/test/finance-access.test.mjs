import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canSeeTariffs,
  defaultFinanceTab,
  visibleFinanceTabs,
} from '../src/app/dashboard/finanzas/access.ts';

test('only ADMIN sees the Tarifario tab', () => {
  assert.equal(canSeeTariffs('ADMIN'), true);
  for (const role of ['SUPERVISOR', 'OPERARIO', 'PRODUCTOR', 'CONTRATISTA', 'VETERINARIO', 'INGENIERO', '', undefined, null]) {
    assert.equal(canSeeTariffs(role), false, String(role));
  }
});

test('ADMIN gets the Tarifario tab and lands on it', () => {
  assert.deepEqual(visibleFinanceTabs('ADMIN'), ['tarifario']);
  assert.equal(defaultFinanceTab('ADMIN'), 'tarifario');
});

test('SUPERVISOR sees no Tarifario tab and has no default tab yet', () => {
  assert.deepEqual(visibleFinanceTabs('SUPERVISOR'), []);
  assert.equal(defaultFinanceTab('SUPERVISOR'), null);
});

test('unknown or missing roles see no tab (fail closed)', () => {
  for (const role of ['OPERARIO', 'ROOT', undefined, null]) {
    assert.deepEqual(visibleFinanceTabs(role), []);
    assert.equal(defaultFinanceTab(role), null);
  }
});
