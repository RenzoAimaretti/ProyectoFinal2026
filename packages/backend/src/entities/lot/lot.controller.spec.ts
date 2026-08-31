import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LotController } from './lot.controller';
import { LotService } from './lot.service';

describe('LotController', () => {
  let controller: LotController;
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
      controllers: [LotController],
      providers: [{ provide: LotService, useValue: service }],
    }).compile();

    controller = module.get(LotController);
  });

  it('protects every route with JwtAuthGuard', () => {
    const methods = ['findAll', 'findOne', 'create', 'update'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        LotController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped requests using req.user.firmaId', async () => {
    service.findAll.mockResolvedValue([{ id: 'lot-1' }]);
    service.findOne.mockResolvedValue({ id: 'lot-1' });
    service.create.mockResolvedValue({ id: 'lot-2' });
    service.update.mockResolvedValue({ id: 'lot-1', name: 'Updated' });

    const req = { user: { firmaId: 'company-1' } };

    await expect(controller.findAll(req)).resolves.toEqual([{ id: 'lot-1' }]);
    await expect(controller.findOne('lot-1', req)).resolves.toEqual({
      id: 'lot-1',
    });
    await expect(
      controller.create(req, {
        name: 'North pasture',
        farmId: 'farm-1',
        coords: '0,0',
        area: 12.5,
        companyId: 'company-2',
      }),
    ).resolves.toEqual({ id: 'lot-2' });
    await expect(
      controller.update('lot-1', req, {
        name: 'Updated',
        farmId: 'farm-1',
        companyId: 'company-2',
      }),
    ).resolves.toEqual({ id: 'lot-1', name: 'Updated' });

    expect(service.findAll).toHaveBeenCalledWith('company-1');
    expect(service.findOne).toHaveBeenCalledWith('lot-1', 'company-1');
    expect(service.create).toHaveBeenCalledWith('company-1', {
      name: 'North pasture',
      farmId: 'farm-1',
      coords: '0,0',
      area: 12.5,
    });
    expect(service.update).toHaveBeenCalledWith('lot-1', 'company-1', {
      name: 'Updated',
      farmId: 'farm-1',
    });
  });
});
