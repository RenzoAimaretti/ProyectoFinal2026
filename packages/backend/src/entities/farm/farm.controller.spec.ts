import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FarmController } from './farm.controller';
import { FarmService } from './farm.service';

describe('FarmController', () => {
  let controller: FarmController;
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
      controllers: [FarmController],
      providers: [{ provide: FarmService, useValue: service }],
    }).compile();

    controller = module.get(FarmController);
  });

  it('protects every route with JwtAuthGuard', () => {
    const methods = ['findAll', 'findOne', 'create', 'update'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        FarmController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped requests using req.user.firmaId', async () => {
    service.findAll.mockResolvedValue([{ id: 'farm-1' }]);
    service.findOne.mockResolvedValue({ id: 'farm-1' });
    service.create.mockResolvedValue({ id: 'farm-2' });
    service.update.mockResolvedValue({ id: 'farm-1', name: 'Updated' });

    const req = { user: { firmaId: 'company-1' } };

    await expect(controller.findAll(req)).resolves.toEqual([{ id: 'farm-1' }]);
    await expect(controller.findOne('farm-1', req)).resolves.toEqual({
      id: 'farm-1',
    });
    await expect(
      controller.create(
        req,
        {
          name: 'North Field',
          location: 'North road',
          companyId: 'company-2',
          surface: 120.5,
        },
      ),
    ).resolves.toEqual({ id: 'farm-2' });
    await expect(
      controller.update(
        'farm-1',
        req,
        {
          name: 'Updated',
          companyId: 'company-2',
        },
      ),
    ).resolves.toEqual({ id: 'farm-1', name: 'Updated' });

    expect(service.findAll).toHaveBeenCalledWith('company-1');
    expect(service.findOne).toHaveBeenCalledWith('farm-1', 'company-1');
    expect(service.create).toHaveBeenCalledWith('company-1', {
      name: 'North Field',
      location: 'North road',
      surface: 120.5,
    });
    expect(service.update).toHaveBeenCalledWith('farm-1', 'company-1', {
      name: 'Updated',
    });
  });
});
