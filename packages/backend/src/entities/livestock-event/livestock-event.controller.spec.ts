import { LivestockEventController } from './livestock-event.controller';

describe('LivestockEventController', () => {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const controller = new LivestockEventController(service as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates livestock-event routes to the service', async () => {
    service.findAll.mockResolvedValue([{ id: 'event-1' }]);
    service.findOne.mockResolvedValue({ id: 'event-1' });
    service.create.mockResolvedValue({ id: 'event-2' });
    service.update.mockResolvedValue({
      id: 'event-1',
      eventType: 'VACUNACION',
    });

    await expect(controller.findAll()).resolves.toEqual([{ id: 'event-1' }]);
    await expect(controller.findOne('event-1')).resolves.toEqual({
      id: 'event-1',
    });
    await expect(
      controller.create({
        eventDate: '2026-08-10T00:00:00.000Z',
        eventType: 'VACUNACION',
        livestockId: 'livestock-1',
        operatorId: 'operator-1',
      }),
    ).resolves.toEqual({ id: 'event-2' });
    await expect(
      controller.update('event-1', { eventType: 'VACUNACION' }),
    ).resolves.toEqual({
      id: 'event-1',
      eventType: 'VACUNACION',
    });

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(service.findOne).toHaveBeenCalledWith('event-1');
    expect(service.create).toHaveBeenCalledWith({
      eventDate: '2026-08-10T00:00:00.000Z',
      eventType: 'VACUNACION',
      livestockId: 'livestock-1',
      operatorId: 'operator-1',
    });
    expect(service.update).toHaveBeenCalledWith('event-1', {
      eventType: 'VACUNACION',
    });
  });
});
