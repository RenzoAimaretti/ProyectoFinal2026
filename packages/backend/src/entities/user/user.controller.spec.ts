import { UserController } from './user.controller';

describe('UserController', () => {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const controller = new UserController(service as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates user routes to the service', async () => {
    service.findAll.mockResolvedValue([{ id: 'user-1' }]);
    service.findOne.mockResolvedValue({ id: 'user-1' });
    service.create.mockResolvedValue({ id: 'user-2' });
    service.update.mockResolvedValue({ id: 'user-1', role: 'OPERARIO' });

    await expect(controller.findAll()).resolves.toEqual([{ id: 'user-1' }]);
    await expect(controller.findOne('user-1')).resolves.toEqual({ id: 'user-1' });
    await expect(
      controller.create({
        companyId: 'company-1',
        email: 'user@firma.com',
        password: 'Password123!',
        role: 'ADMIN',
      }),
    ).resolves.toEqual({ id: 'user-2' });
    await expect(controller.update('user-1', { role: 'OPERARIO' })).resolves.toEqual({
      id: 'user-1',
      role: 'OPERARIO',
    });

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(service.findOne).toHaveBeenCalledWith('user-1');
    expect(service.create).toHaveBeenCalledWith({
      companyId: 'company-1',
      email: 'user@firma.com',
      password: 'Password123!',
      role: 'ADMIN',
    });
    expect(service.update).toHaveBeenCalledWith('user-1', { role: 'OPERARIO' });
  });
});
