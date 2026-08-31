import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

describe('TaskController', () => {
  let controller: TaskController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    addOperario: jest.Mock;
    removeOperario: jest.Mock;
    delete: jest.Mock;
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
      addOperario: jest.fn(),
      removeOperario: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [{ provide: TaskService, useValue: service }],
    }).compile();

    controller = module.get(TaskController);
  });

  it('protects every route with JwtAuthGuard', () => {
    const methods = ['findAll', 'findOne', 'create', 'update', 'addOperario', 'removeOperario', 'delete'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        TaskController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped requests using req.user.firmaId', async () => {
    service.findAll.mockResolvedValue([{ id: 'task-1' }]);
    service.findOne.mockResolvedValue({ id: 'task-1' });
    service.create.mockResolvedValue({ id: 'task-2' });
    service.update.mockResolvedValue({ id: 'task-1', status: 'EN_PROGRESO' });
    service.addOperario.mockResolvedValue({ message: 'added' });
    service.removeOperario.mockResolvedValue({ message: 'removed' });
    service.delete.mockResolvedValue({ message: 'deleted' });

    const req = { user: { firmaId: 'company-1' } };

    await expect((controller as any).findAll(req)).resolves.toEqual([{ id: 'task-1' }]);
    await expect((controller as any).findOne('task-1', req)).resolves.toEqual({ id: 'task-1' });
    await expect(
      (controller as any).create(req, {
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        startedAt: '2026-01-10',
        companyId: 'company-2',
      } as never),
    ).resolves.toEqual({ id: 'task-2' });
    await expect(
      (controller as any).update('task-1', req, {
        status: 'EN_PROGRESO' as never,
        companyId: 'company-2',
      } as never),
    ).resolves.toEqual({ id: 'task-1', status: 'EN_PROGRESO' });
    await expect((controller as any).addOperario('task-1', 'user-1', req)).resolves.toEqual({
      message: 'added',
    });
    await expect((controller as any).removeOperario('task-1', 'user-1', req)).resolves.toEqual({
      message: 'removed',
    });
    await expect((controller as any).delete('task-1', req)).resolves.toEqual({ message: 'deleted' });

    expect(service.findAll).toHaveBeenCalledWith('company-1');
    expect(service.findOne).toHaveBeenCalledWith('task-1', 'company-1');
    expect(service.create).toHaveBeenCalledWith('company-1', {
      lotId: 'lot-1',
      taskTypeId: 'task-type-1',
      startedAt: '2026-01-10',
    });
    expect(service.update).toHaveBeenCalledWith('task-1', 'company-1', {
      status: 'EN_PROGRESO',
    });
    expect(service.addOperario).toHaveBeenCalledWith('task-1', 'user-1', 'company-1');
    expect(service.removeOperario).toHaveBeenCalledWith('task-1', 'user-1', 'company-1');
    expect(service.delete).toHaveBeenCalledWith('task-1', 'company-1');
  });
});
