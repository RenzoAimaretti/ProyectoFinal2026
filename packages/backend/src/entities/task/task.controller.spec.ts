import { TaskController } from './task.controller';

describe('TaskController', () => {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    addOperario: jest.fn(),
    removeOperario: jest.fn(),
    delete: jest.fn(),
  };

  const controller = new TaskController(service as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates task routes to the service', async () => {
    service.findAll.mockResolvedValue([{ id: 'task-1' }]);
    service.findOne.mockResolvedValue({ id: 'task-1' });
    service.create.mockResolvedValue({ id: 'task-2' });
    service.update.mockResolvedValue({ id: 'task-1', status: 'EN_PROGRESO' });
    service.addOperario.mockResolvedValue({ message: 'added' });
    service.removeOperario.mockResolvedValue({ message: 'removed' });
    service.delete.mockResolvedValue({ message: 'deleted' });

    await expect(controller.findAll()).resolves.toEqual([{ id: 'task-1' }]);
    await expect(controller.findOne('task-1')).resolves.toEqual({ id: 'task-1' });
    await expect(
      controller.create({ lotId: 'lot-1', taskTypeId: 'task-type-1', startedAt: '2026-01-10' }),
    ).resolves.toEqual({ id: 'task-2' });
    await expect(
      controller.update('task-1', { status: 'EN_PROGRESO' as never }),
    ).resolves.toEqual({ id: 'task-1', status: 'EN_PROGRESO' });
    await expect(controller.addOperario('task-1', 'user-1')).resolves.toEqual({ message: 'added' });
    await expect(controller.removeOperario('task-1', 'user-1')).resolves.toEqual({ message: 'removed' });
    await expect(controller.delete('task-1')).resolves.toEqual({ message: 'deleted' });

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(service.findOne).toHaveBeenCalledWith('task-1');
    expect(service.create).toHaveBeenCalledWith({
      lotId: 'lot-1',
      taskTypeId: 'task-type-1',
      startedAt: '2026-01-10',
    });
    expect(service.update).toHaveBeenCalledWith('task-1', { status: 'EN_PROGRESO' });
    expect(service.addOperario).toHaveBeenCalledWith('task-1', 'user-1');
    expect(service.removeOperario).toHaveBeenCalledWith('task-1', 'user-1');
    expect(service.delete).toHaveBeenCalledWith('task-1');
  });
});
