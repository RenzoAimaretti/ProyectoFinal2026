import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WeightRecordController } from './weight-record.controller';
import { WeightRecordService } from './weight-record.service';

describe('WeightRecordController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('protects every route with JwtAuthGuard', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeightRecordController],
      providers: [{ provide: WeightRecordService, useValue: {} }],
    }).compile();

    const methods = ['findAll', 'findOne', 'create', 'update', 'remove'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        module.get(WeightRecordController).constructor.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped requests using req.user.firmaId', async () => {
    const service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    service.findAll.mockResolvedValue([{ id: 'weight-1' }]);
    service.findOne.mockResolvedValue({ id: 'weight-1' });
    service.create.mockResolvedValue({ id: 'weight-2' });
    service.update.mockResolvedValue({ id: 'weight-1', weight: 420 });
    service.delete.mockResolvedValue({ message: 'deleted' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeightRecordController],
      providers: [{ provide: WeightRecordService, useValue: service }],
    }).compile();

    const controller = module.get(WeightRecordController) as never;
    const req = { user: { firmaId: 'company-1' } };

    await expect((controller as any).findAll(req)).resolves.toEqual([{ id: 'weight-1' }]);
    await expect((controller as any).findOne('weight-1', req)).resolves.toEqual({ id: 'weight-1' });
    await expect(
      (controller as any).create(req, {
        companyId: 'company-2',
        livestockId: 'livestock-1',
        operatorId: 'operator-1',
        weight: 420,
        measuredAt: '2026-08-10T00:00:00.000Z',
      }),
    ).resolves.toEqual({ id: 'weight-2' });
    await expect(
      (controller as any).update('weight-1', req, {
        companyId: 'company-2',
        weight: 420,
      }),
    ).resolves.toEqual({ id: 'weight-1', weight: 420 });
    await expect((controller as any).remove('weight-1', req)).resolves.toEqual({
      message: 'deleted',
    });

    expect(service.findAll).toHaveBeenCalledWith('company-1');
    expect(service.findOne).toHaveBeenCalledWith('weight-1', 'company-1');
    expect(service.create).toHaveBeenCalledWith('company-1', {
      livestockId: 'livestock-1',
      operatorId: 'operator-1',
      weight: 420,
      measuredAt: '2026-08-10T00:00:00.000Z',
    });
    expect(service.update).toHaveBeenCalledWith('weight-1', 'company-1', { weight: 420 });
    expect(service.delete).toHaveBeenCalledWith('weight-1', 'company-1');
  });
});
