import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LivestockController } from './livestock.controller';
import { LivestockService } from './livestock.service';

describe('LivestockController', () => {
  let controller: LivestockController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivestockController],
      providers: [{ provide: LivestockService, useValue: service }],
    }).compile();

    controller = module.get(LivestockController);
  });

  it('protects every route with JwtAuthGuard', () => {
    const methods = ['findAll', 'findOne', 'create', 'update', 'remove'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        LivestockController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped requests using req.user.firmaId', async () => {
    service.findAll.mockResolvedValue([{ id: 'livestock-1' }]);
    service.findOne.mockResolvedValue({ id: 'livestock-1' });
    service.create.mockResolvedValue({ id: 'livestock-2' });
    service.update.mockResolvedValue({ id: 'livestock-1', tagNumber: 'TAG-002' });
    service.remove.mockResolvedValue({ message: 'deleted' });

    const req = { user: { firmaId: 'company-1' } };
    const scopedController = controller as never;

    await expect((scopedController as any).findAll(req)).resolves.toEqual([{ id: 'livestock-1' }]);
    await expect((scopedController as any).findOne('livestock-1', req)).resolves.toEqual({
      id: 'livestock-1',
    });
    await expect(
      (scopedController as any).create(req, {
        companyId: 'company-2',
        tagNumber: 'TAG-002',
        species: 'Bovine',
        sex: 'M',
      }),
    ).resolves.toEqual({ id: 'livestock-2' });
    await expect(
      (scopedController as any).update('livestock-1', req, {
        tagNumber: 'TAG-002',
        companyId: 'company-2',
      }),
    ).resolves.toEqual({ id: 'livestock-1', tagNumber: 'TAG-002' });
    await expect((scopedController as any).remove('livestock-1', req)).resolves.toEqual({
      message: 'deleted',
    });

    expect(service.findAll).toHaveBeenCalledWith('company-1');
    expect(service.findOne).toHaveBeenCalledWith('livestock-1', 'company-1');
    expect(service.create).toHaveBeenCalledWith('company-1', {
      tagNumber: 'TAG-002',
      species: 'Bovine',
      sex: 'M',
    });
    expect(service.update).toHaveBeenCalledWith('livestock-1', 'company-1', {
      tagNumber: 'TAG-002',
    });
    expect(service.remove).toHaveBeenCalledWith('livestock-1', 'company-1');
  });
});
