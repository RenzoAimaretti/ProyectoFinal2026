import { MachineController } from './machine.controller';

describe('MachineController', () => {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const controller = new MachineController(service as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates machine routes to the service', async () => {
    service.findAll.mockResolvedValue([{ id: 'machine-1' }]);
    service.findOne.mockResolvedValue({ id: 'machine-1' });
    service.create.mockResolvedValue({ id: 'machine-2' });
    service.update.mockResolvedValue({ id: 'machine-1', status: 'MANTENIMIENTO' });

    await expect(controller.findAll()).resolves.toEqual([{ id: 'machine-1' }]);
    await expect(controller.findOne('machine-1')).resolves.toEqual({ id: 'machine-1' });
    await expect(
      controller.create({
        companyId: 'company-1',
        name: 'Tractor',
        brand: 'John Deere',
        entryDate: '2026-01-10',
      }),
    ).resolves.toEqual({ id: 'machine-2' });
    await expect(
      controller.update('machine-1', {
        status: 'MANTENIMIENTO' as never,
      }),
    ).resolves.toEqual({ id: 'machine-1', status: 'MANTENIMIENTO' });

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(service.findOne).toHaveBeenCalledWith('machine-1');
    expect(service.create).toHaveBeenCalledWith({
      companyId: 'company-1',
      name: 'Tractor',
      brand: 'John Deere',
      entryDate: '2026-01-10',
    });
    expect(service.update).toHaveBeenCalledWith('machine-1', { status: 'MANTENIMIENTO' });
  });
});
