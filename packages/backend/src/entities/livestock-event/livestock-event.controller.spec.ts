import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { LivestockEventController } from './livestock-event.controller';
import { LivestockEventService } from './livestock-event.service';

describe('LivestockEventController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('protects every route with JwtAuthGuard', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivestockEventController],
      providers: [{ provide: LivestockEventService, useValue: {} }],
    }).compile();

    const methods = ['findAll', 'findOne', 'create', 'update'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        module.get(LivestockEventController).constructor.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('restricts reads to ADMIN, SUPERVISOR and OPERARIO so PRODUCTOR gets 403', () => {
    for (const method of ['findAll', 'findOne'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        LivestockEventController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;
      expect(guards).toContain(RolesGuard);

      const roles = Reflect.getMetadata(
        ROLES_KEY,
        LivestockEventController.prototype[method],
      ) as string[] | undefined;
      expect(roles).toEqual(['ADMIN', 'SUPERVISOR', 'OPERARIO']);
      expect(roles).not.toContain('PRODUCTOR');
    }
  });

  it('delegates tenant-scoped requests using req.user.firmaId', async () => {
    const service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    service.findAll.mockResolvedValue([{ id: 'event-1' }]);
    service.findOne.mockResolvedValue({ id: 'event-1' });
    service.create.mockResolvedValue({ id: 'event-2' });
    service.update.mockResolvedValue({ id: 'event-1', eventType: 'VACUNACION' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivestockEventController],
      providers: [{ provide: LivestockEventService, useValue: service }],
    }).compile();

    const controller = module.get(LivestockEventController) as never;
    const req = { user: { firmaId: 'company-1' } };

    await expect((controller as any).findAll(req)).resolves.toEqual([{ id: 'event-1' }]);
    await expect((controller as any).findOne('event-1', req)).resolves.toEqual({ id: 'event-1' });
    await expect(
      (controller as any).create(req, {
        companyId: 'company-2',
        eventDate: '2026-08-10T00:00:00.000Z',
        eventType: 'VACUNACION',
        livestockId: 'livestock-1',
        operatorId: 'operator-1',
      }),
    ).resolves.toEqual({ id: 'event-2' });
    await expect(
      (controller as any).update('event-1', req, {
        companyId: 'company-2',
        eventType: 'VACUNACION',
      }),
    ).resolves.toEqual({ id: 'event-1', eventType: 'VACUNACION' });

    expect(service.findAll).toHaveBeenCalledWith('company-1');
    expect(service.findOne).toHaveBeenCalledWith('event-1', 'company-1');
    expect(service.create).toHaveBeenCalledWith('company-1', {
      eventDate: '2026-08-10T00:00:00.000Z',
      eventType: 'VACUNACION',
      livestockId: 'livestock-1',
      operatorId: 'operator-1',
    });
    expect(service.update).toHaveBeenCalledWith('event-1', 'company-1', {
      eventType: 'VACUNACION',
    });
  });
});
