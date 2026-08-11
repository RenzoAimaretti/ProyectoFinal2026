import { WeightRecordController } from './weight-record.controller';

describe('WeightRecordController', () => {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const controller = new WeightRecordController(service as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates weight-record routes to the service', async () => {
    service.findAll.mockResolvedValue([{ id: 'weight-1' }]);
    service.findOne.mockResolvedValue({ id: 'weight-1' });
    service.create.mockResolvedValue({ id: 'weight-2' });
    service.update.mockResolvedValue({ id: 'weight-1', weight: 420 });
    service.delete.mockResolvedValue({ message: 'deleted' });

    await expect(controller.findAll()).resolves.toEqual([{ id: 'weight-1' }]);
    await expect(controller.findOne('weight-1')).resolves.toEqual({
      id: 'weight-1',
    });
    await expect(
      controller.create({
        livestockId: 'livestock-1',
        operatorId: 'operator-1',
        weight: 420,
        measuredAt: '2026-08-10T00:00:00.000Z',
      }),
    ).resolves.toEqual({ id: 'weight-2' });
    await expect(
      controller.update('weight-1', { weight: 420 }),
    ).resolves.toEqual({
      id: 'weight-1',
      weight: 420,
    });
    await expect(controller.remove('weight-1')).resolves.toEqual({
      message: 'deleted',
    });

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(service.findOne).toHaveBeenCalledWith('weight-1');
    expect(service.create).toHaveBeenCalledWith({
      livestockId: 'livestock-1',
      operatorId: 'operator-1',
      weight: 420,
      measuredAt: '2026-08-10T00:00:00.000Z',
    });
    expect(service.update).toHaveBeenCalledWith('weight-1', { weight: 420 });
    expect(service.delete).toHaveBeenCalledWith('weight-1');
  });
});
