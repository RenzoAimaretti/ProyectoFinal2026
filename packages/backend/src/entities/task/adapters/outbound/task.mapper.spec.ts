import { TaskStatusValue } from '../../application/task.types';
import { TaskReadRow, toTaskReadOutput } from './task.mapper';

const baseRow: TaskReadRow = {
  id: 'task-1',
  lotId: 'lot-1',
  taskTypeId: 'task-type-1',
  status: 'PENDIENTE' as TaskStatusValue,
  startedAt: new Date('2026-01-10T00:00:00.000Z'),
  finishedAt: null,
  updatedTaskAt: null,
  createdAt: new Date('2026-01-11T00:00:00.000Z'),
  updatedAt: new Date('2026-01-12T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

describe('toTaskReadOutput', () => {
  it('maps lot, farm, task type and operator display names', () => {
    const output = toTaskReadOutput({
      ...baseRow,
      lot: { name: 'Lote N°1', farm: { name: 'Agro-Sur' } },
      taskType: { name: 'Pulverización' },
      operators: [
        { id: 'user-1', username: 'juan', email: 'juan@agrolify.local' },
        { id: 'user-2', username: null, email: 'operario@agrolify.local' },
      ],
    });

    expect(output).toMatchObject({
      id: 'task-1',
      lotName: 'Lote N°1',
      farmName: 'Agro-Sur',
      taskTypeName: 'Pulverización',
      operators: [
        { id: 'user-1', name: 'juan' },
        { id: 'user-2', name: 'operario@agrolify.local' },
      ],
    });
    expect(output).not.toHaveProperty('lot');
    expect(output).not.toHaveProperty('taskType');
  });

  it('keeps the enrichment optional when relations are not loaded', () => {
    const output = toTaskReadOutput(baseRow);

    expect(output).toEqual(baseRow);
    expect(output.lotName).toBeUndefined();
    expect(output.farmName).toBeUndefined();
    expect(output.taskTypeName).toBeUndefined();
    expect(output.operators).toBeUndefined();
  });
});
