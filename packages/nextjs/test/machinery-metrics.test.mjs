import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeUsage, legacyFieldHistory, canManageFleet } from '../src/app/dashboard/maquinaria/metrics.ts';

test('usage totals come only from task-linked usages, never legacy activities', () => {
  const usages = [
    { machineId: 'a', taskId: 't1', usageHours: 2, hectares: 3 },
    { machineId: 'a', taskId: 't2', usageHours: null, hectares: 1 },
    { machineId: 'b', taskId: 't3', usageHours: 7, hectares: 8 },
  ];
  assert.deepEqual(summarizeUsage('a', usages), { usageHours: 2, hectares: 4 });
  assert.deepEqual(summarizeUsage('missing', usages), { usageHours: 0, hectares: 0 });
  assert.deepEqual(legacyFieldHistory([
    { type: 'USO_CAMPO', usageHours: 100 }, { type: 'COMBUSTIBLE', usageHours: 12 },
  ]), [{ type: 'USO_CAMPO', usageHours: 100 }]);
});

test('only ADMIN may see management sections', () => {
  assert.equal(canManageFleet('ADMIN'), true);
  for (const role of ['SUPERVISOR', 'OPERARIO', undefined, null]) {
    assert.equal(canManageFleet(role), false);
  }
});
