import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TaskTypeController } from './task-type.controller';
import { TaskTypeService } from './task-type.service';

describe('TaskTypeController', () => {
  let controller: TaskTypeController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskTypeController],
      providers: [{ provide: TaskTypeService, useValue: service }],
    }).compile();

    controller = module.get(TaskTypeController);
  });

  it('protects every route with JwtAuthGuard', () => {
    const methods = ['findAll', 'findOne', 'create', 'update', 'delete'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        TaskTypeController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped requests using req.user.firmaId', async () => {
    service.findAll.mockResolvedValue([{ id: 'task-type-1' }]);
    service.findOne.mockResolvedValue({ id: 'task-type-1' });
    service.create.mockResolvedValue({ id: 'task-type-2' });
    service.update.mockResolvedValue({ id: 'task-type-1', name: 'Nuevo nombre' });
    service.delete.mockResolvedValue({ message: 'deleted' });

    const req = { user: { firmaId: 'company-1' } };

    await expect(controller.findAll(req)).resolves.toEqual([{ id: 'task-type-1' }]);
    await expect(controller.findOne('task-type-1', req)).resolves.toEqual({
      id: 'task-type-1',
    });
    await expect(
      controller.create(req, ({ name: 'Nuevo tipo', companyId: 'company-2' } as never)),
    ).resolves.toEqual({ id: 'task-type-2' });
    await expect(
      controller.update('task-type-1', req, {
        name: 'Nuevo nombre',
        companyId: 'company-2' as never,
      } as never),
    ).resolves.toEqual({
      id: 'task-type-1',
      name: 'Nuevo nombre',
    });
    await expect(controller.delete('task-type-1', req)).resolves.toEqual({
      message: 'deleted',
    });

    expect(service.findAll).toHaveBeenCalledWith('company-1');
    expect(service.findOne).toHaveBeenCalledWith('task-type-1', 'company-1');
    expect(service.create).toHaveBeenCalledWith('company-1', { name: 'Nuevo tipo' });
    expect(service.update).toHaveBeenCalledWith('task-type-1', 'company-1', {
      name: 'Nuevo nombre',
    });
    expect(service.delete).toHaveBeenCalledWith('task-type-1', 'company-1');
  });
});
