import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LivestockMovementController } from './livestock-movement.controller';
import { LivestockMovementService } from './livestock-movement.service';

describe('LivestockMovementController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('protects every route with JwtAuthGuard', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivestockMovementController],
      providers: [{ provide: LivestockMovementService, useValue: {} }],
    }).compile();

    const methods = ['findAll', 'findOne', 'create'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        module.get(LivestockMovementController).constructor.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped requests using req.user.firmaId', async () => {
    const service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    service.findAll.mockResolvedValue([{ id: 'movement-1' }]);
    service.findOne.mockResolvedValue({ id: 'movement-1' });
    service.create.mockResolvedValue({ id: 'movement-2' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivestockMovementController],
      providers: [{ provide: LivestockMovementService, useValue: service }],
    }).compile();

    const controller = module.get(LivestockMovementController) as never;
    const req = { user: { firmaId: 'company-1' } };

    await expect((controller as any).findAll(req)).resolves.toEqual([{ id: 'movement-1' }]);
    await expect((controller as any).findOne('movement-1', req)).resolves.toEqual({
      id: 'movement-1',
    });
    await expect(
      (controller as any).create(req, {
        companyId: 'company-2',
        livestockId: 'livestock-1',
        lotId: 'lot-1',
        movementDate: '2026-08-10T00:00:00.000Z',
        observations: 'Moved to north paddock',
      }),
    ).resolves.toEqual({ id: 'movement-2' });

    expect(service.findAll).toHaveBeenCalledWith('company-1');
    expect(service.findOne).toHaveBeenCalledWith('movement-1', 'company-1');
    expect(service.create).toHaveBeenCalledWith('company-1', {
      livestockId: 'livestock-1',
      lotId: 'lot-1',
      movementDate: '2026-08-10T00:00:00.000Z',
      observations: 'Moved to north paddock',
    });
  });
});
