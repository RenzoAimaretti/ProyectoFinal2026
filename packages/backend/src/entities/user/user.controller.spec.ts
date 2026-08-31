import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: service }],
    }).compile();

    controller = module.get(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('protects every route with JwtAuthGuard', () => {
    const methods = ['findAll', 'findOne', 'create', 'update'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, UserController.prototype[method]) as
        | Array<new (...args: never[]) => unknown>
        | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped requests using req.user.firmaId', async () => {
    service.findAll.mockResolvedValue([{ id: 'user-1' }]);
    service.findOne.mockResolvedValue({ id: 'user-1' });
    service.create.mockResolvedValue({ id: 'user-2' });
    service.update.mockResolvedValue({ id: 'user-1', role: 'OPERARIO' });

    const req = { user: { firmaId: 'company-1' } };

    await expect((controller as any).findAll(req)).resolves.toEqual([{ id: 'user-1' }]);
    await expect((controller as any).findOne('user-1', req)).resolves.toEqual({ id: 'user-1' });
    await expect(
      (controller as any).create(req, {
        companyId: 'company-1',
        email: 'user@firma.com',
        password: 'Password123!',
        role: 'ADMIN',
      }),
    ).resolves.toEqual({ id: 'user-2' });
    await expect((controller as any).update('user-1', req, { role: 'OPERARIO' })).resolves.toEqual({
      id: 'user-1',
      role: 'OPERARIO',
    });

    expect(service.findAll).toHaveBeenCalledWith('company-1');
    expect(service.findOne).toHaveBeenCalledWith('user-1', 'company-1');
    expect(service.create).toHaveBeenCalledWith('company-1', {
      email: 'user@firma.com',
      password: 'Password123!',
      role: 'ADMIN',
    });
    expect(service.update).toHaveBeenCalledWith('user-1', 'company-1', { role: 'OPERARIO' });
  });
});
