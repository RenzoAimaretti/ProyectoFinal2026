import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { ROLES_KEY } from '../../../../auth/decorators/roles.decorator';
import { MachineActivityRecord } from '../../application/machine-activity.types';
import { FindAllMachineActivitiesUseCase } from '../../application/use-cases/find-all-machine-activities.use-case';
import { FindMachineActivityUseCase } from '../../application/use-cases/find-machine-activity.use-case';
import { RegisterMachineActivityUseCase } from '../../application/use-cases/register-machine-activity.use-case';
import {
  EntityNotFoundError,
  InvalidRelationError,
} from '../../domain/errors';
import { MachineActivityController } from './machine-activity.controller';

const mockActivity: MachineActivityRecord = {
  id: 'activity-1',
  machineId: 'machine-1',
  companyId: 'company-1',
  type: 'COMBUSTIBLE',
  date: new Date('2026-03-09T00:00:00.000Z'),
  liters: 120,
  receipt: 'A-0001',
  cost: null,
  spareParts: null,
  usageHours: null,
  hectares: null,
  observations: null,
  createdAt: new Date('2026-03-09T10:00:00.000Z'),
  updatedAt: new Date('2026-03-09T10:00:00.000Z'),
};

const req = { user: { firmaId: 'company-1' } };

describe('MachineActivityController', () => {
  let controller: MachineActivityController;
  let findAllMachineActivities: jest.Mocked<FindAllMachineActivitiesUseCase>;
  let findMachineActivity: jest.Mocked<FindMachineActivityUseCase>;
  let registerMachineActivity: jest.Mocked<RegisterMachineActivityUseCase>;

  beforeEach(() => {
    findAllMachineActivities = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindAllMachineActivitiesUseCase>;
    findMachineActivity = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindMachineActivityUseCase>;
    registerMachineActivity = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RegisterMachineActivityUseCase>;

    controller = new MachineActivityController(
      findAllMachineActivities,
      findMachineActivity,
      registerMachineActivity,
    );
  });

  it('protects every route with JwtAuthGuard', () => {
    for (const method of ['findAll', 'findOne', 'create'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        MachineActivityController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('restricts reads to ADMIN, SUPERVISOR and OPERARIO so PRODUCTOR gets 403', () => {
    for (const method of ['findAll', 'findOne'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        MachineActivityController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;
      expect(guards).toContain(RolesGuard);

      const roles = Reflect.getMetadata(
        ROLES_KEY,
        MachineActivityController.prototype[method],
      ) as string[] | undefined;
      expect(roles).toEqual(['ADMIN', 'SUPERVISOR', 'OPERARIO']);
      expect(roles).not.toContain('PRODUCTOR');
    }
  });

  it('scopes reads and writes to the caller firm from firmaId', async () => {
    findAllMachineActivities.execute.mockResolvedValue([mockActivity]);
    findMachineActivity.execute.mockResolvedValue(mockActivity);
    registerMachineActivity.execute.mockResolvedValue(mockActivity);

    const body = {
      machineId: 'machine-1',
      type: 'COMBUSTIBLE' as const,
      date: '2026-03-09T00:00:00.000Z',
      liters: 120,
    };

    await expect(controller.findAll(req as never)).resolves.toEqual([
      mockActivity,
    ]);
    await expect(controller.findOne('activity-1', req as never)).resolves.toEqual(
      mockActivity,
    );
    await expect(controller.create(req as never, body)).resolves.toEqual(
      mockActivity,
    );

    expect(findAllMachineActivities.execute).toHaveBeenCalledWith('company-1');
    expect(findMachineActivity.execute).toHaveBeenCalledWith(
      'activity-1',
      'company-1',
    );
    expect(registerMachineActivity.execute).toHaveBeenCalledWith(
      'company-1',
      body,
    );
  });

  it('maps domain errors to HTTP exceptions', async () => {
    findMachineActivity.execute.mockRejectedValue(
      new EntityNotFoundError('Machine activity with id activity-9 not found'),
    );
    await expect(controller.findOne('activity-9', req as never)).rejects.toThrow(
      NotFoundException,
    );

    registerMachineActivity.execute.mockRejectedValue(
      new InvalidRelationError('Machine with id machine-9 not found'),
    );
    await expect(
      controller.create(req as never, {
        machineId: 'machine-9',
        type: 'COMBUSTIBLE',
        date: '2026-03-09T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
