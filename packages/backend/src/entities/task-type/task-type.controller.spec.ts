import { TaskTypeController } from './task-type.controller';

describe('TaskTypeController', () => {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const controller = new TaskTypeController(service as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates task-type routes to the service', async () => {
    service.findAll.mockResolvedValue([{ id: 'task-type-1' }]);
    service.findOne.mockResolvedValue({ id: 'task-type-1' });
    service.create.mockResolvedValue({ id: 'task-type-2' });
    service.update.mockResolvedValue({ id: 'task-type-1', name: 'Nuevo nombre' });
    service.delete.mockResolvedValue({ message: 'deleted' });

    await expect(controller.findAll()).resolves.toEqual([{ id: 'task-type-1' }]);
    await expect(controller.findOne('task-type-1')).resolves.toEqual({ id: 'task-type-1' });
    await expect(controller.create({ name: 'Nuevo tipo' })).resolves.toEqual({ id: 'task-type-2' });
    await expect(controller.update('task-type-1', { name: 'Nuevo nombre' })).resolves.toEqual({
      id: 'task-type-1',
      name: 'Nuevo nombre',
    });
    await expect(controller.delete('task-type-1')).resolves.toEqual({ message: 'deleted' });

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(service.findOne).toHaveBeenCalledWith('task-type-1');
    expect(service.create).toHaveBeenCalledWith({ name: 'Nuevo tipo' });
    expect(service.update).toHaveBeenCalledWith('task-type-1', { name: 'Nuevo nombre' });
    expect(service.delete).toHaveBeenCalledWith('task-type-1');
  });
});
