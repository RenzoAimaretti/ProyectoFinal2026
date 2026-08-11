import { MachineUsageController } from './machine-usage.controller';

describe('MachineUsageController', () => {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const controller = new MachineUsageController(service as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates machine-usage routes to the service', async () => {
    service.findAll.mockResolvedValue([{ id: 'usage-1' }]);
    service.findOne.mockResolvedValue({ id: 'usage-1' });
    service.create.mockResolvedValue({ id: 'usage-2' });
    service.update.mockResolvedValue({ id: 'usage-1', finalFuel: 8 });

    await expect(controller.findAll()).resolves.toEqual([{ id: 'usage-1' }]);
    await expect(controller.findOne('usage-1')).resolves.toEqual({ id: 'usage-1' });
    await expect(
      controller.create({
        machineId: 'machine-1',
        taskId: 'task-1',
        operatorId: 'user-1',
        intialFuel: 12,
      }),
    ).resolves.toEqual({ id: 'usage-2' });
    await expect(
      controller.update('usage-1', { initialFuel: 11, finalFuel: 8 }),
    ).resolves.toEqual({ id: 'usage-1', finalFuel: 8 });

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(service.findOne).toHaveBeenCalledWith('usage-1');
    expect(service.create).toHaveBeenCalledWith({
      machineId: 'machine-1',
      taskId: 'task-1',
      operatorId: 'user-1',
      intialFuel: 12,
    });
    expect(service.update).toHaveBeenCalledWith('usage-1', { initialFuel: 11, finalFuel: 8 });
  });
});
