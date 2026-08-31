import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MachineController } from './machine.controller';
import { MachineService } from './machine.service';

describe('MachineController', () => {
  let controller: MachineController;
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
      controllers: [MachineController],
      providers: [{ provide: MachineService, useValue: service }],
    }).compile();

    controller = module.get(MachineController);
  });

  it('protects every route with JwtAuthGuard', () => {
    const methods = ['findAll', 'findOne', 'create', 'update'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        MachineController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped requests using req.user.firmaId', async () => {
    service.findAll.mockResolvedValue([{ id: 'machine-1' }]);
    service.findOne.mockResolvedValue({ id: 'machine-1' });
    service.create.mockResolvedValue({ id: 'machine-2' });
    service.update.mockResolvedValue({ id: 'machine-1', status: 'MANTENIMIENTO' });

    const req = { user: { firmaId: 'company-1' } };
    const scopedController = controller as never;

    await expect((scopedController as any).findAll(req)).resolves.toEqual([{ id: 'machine-1' }]);
    await expect((scopedController as any).findOne('machine-1', req)).resolves.toEqual({
      id: 'machine-1',
    });
    await expect(
      (scopedController as any).create(req, {
        companyId: 'company-2',
        name: 'Tractor',
        brand: 'John Deere',
        entryDate: '2026-01-10',
      }),
    ).resolves.toEqual({ id: 'machine-2' });
    await expect(
      (scopedController as any).update('machine-1', req, {
        status: 'MANTENIMIENTO' as never,
      }),
    ).resolves.toEqual({ id: 'machine-1', status: 'MANTENIMIENTO' });

    expect(service.findAll).toHaveBeenCalledWith('company-1');
    expect(service.findOne).toHaveBeenCalledWith('machine-1', 'company-1');
    expect(service.create).toHaveBeenCalledWith('company-1', {
      name: 'Tractor',
      brand: 'John Deere',
      entryDate: '2026-01-10',
    });
    expect(service.update).toHaveBeenCalledWith('machine-1', 'company-1', {
      status: 'MANTENIMIENTO',
    });
  });
});
