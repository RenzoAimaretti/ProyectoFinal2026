import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { MachineUsageController } from './machine-usage.controller';
import { MachineUsageService } from './machine-usage.service';

describe('MachineUsageController', () => {
  let controller: MachineUsageController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MachineUsageController],
      providers: [{ provide: MachineUsageService, useValue: service }],
    }).compile();

    controller = module.get(MachineUsageController);
  });

  it('protects every route with JwtAuthGuard', () => {
    const methods = ['findAll', 'findOne', 'create', 'update'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        MachineUsageController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('restricts reads to ADMIN, SUPERVISOR and OPERARIO so PRODUCTOR gets 403', () => {
    for (const method of ['findAll', 'findOne'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        MachineUsageController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;
      expect(guards).toContain(RolesGuard);

      const roles = Reflect.getMetadata(
        ROLES_KEY,
        MachineUsageController.prototype[method],
      ) as string[] | undefined;
      expect(roles).toEqual(['ADMIN', 'SUPERVISOR', 'OPERARIO']);
      expect(roles).not.toContain('PRODUCTOR');
    }
  });

  it('delegates tenant-scoped requests using req.user.firmaId', async () => {
    service.findAll.mockResolvedValue([{ id: 'usage-1' }]);
    service.findOne.mockResolvedValue({ id: 'usage-1' });
    service.create.mockResolvedValue({ id: 'usage-2' });
    service.update.mockResolvedValue({ id: 'usage-1', finalFuel: 8 });

    const req = { user: { firmaId: 'company-1' } };

    await expect((controller as any).findAll(req)).resolves.toEqual([{ id: 'usage-1' }]);
    await expect((controller as any).findOne('usage-1', req)).resolves.toEqual({ id: 'usage-1' });
    await expect(
      (controller as any).create(req, {
        machineId: 'machine-1',
        taskId: 'task-1',
        operatorId: 'user-1',
        intialFuel: 12,
      }),
    ).resolves.toEqual({ id: 'usage-2' });
    await expect(
      (controller as any).update('usage-1', req, { initialFuel: 11, finalFuel: 8 }),
    ).resolves.toEqual({ id: 'usage-1', finalFuel: 8 });

    expect(service.findAll).toHaveBeenCalledWith('company-1');
    expect(service.findOne).toHaveBeenCalledWith('usage-1', 'company-1');
    expect(service.create).toHaveBeenCalledWith('company-1', {
      machineId: 'machine-1',
      taskId: 'task-1',
      operatorId: 'user-1',
      intialFuel: 12,
    });
    expect(service.update).toHaveBeenCalledWith('usage-1', 'company-1', {
      initialFuel: 11,
      finalFuel: 8,
    });
  });
});
