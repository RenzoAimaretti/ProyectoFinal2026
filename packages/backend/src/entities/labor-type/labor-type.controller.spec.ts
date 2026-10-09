import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { LaborTypeController } from './labor-type.controller';
import { LaborTypeService } from './labor-type.service';

describe('LaborTypeController', () => {
  let controller: LaborTypeController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findCategories: jest.Mock;
    replaceCategories: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findCategories: jest.fn(),
      replaceCategories: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LaborTypeController],
      providers: [{ provide: LaborTypeService, useValue: service }],
    }).compile();

    controller = module.get(LaborTypeController);
  });

  it('protects every route with JwtAuthGuard', () => {
    const methods = ['findAll', 'findOne', 'findCategories', 'replaceCategories', 'create', 'update', 'delete'] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        LaborTypeController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('restricts reads to ADMIN, SUPERVISOR and OPERARIO so PRODUCTOR gets 403', () => {
    for (const method of ['findAll', 'findOne', 'findCategories'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        LaborTypeController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;
      expect(guards).toContain(RolesGuard);

      const roles = Reflect.getMetadata(
        ROLES_KEY,
        LaborTypeController.prototype[method],
      ) as string[] | undefined;
      expect(roles).toEqual(['ADMIN', 'SUPERVISOR', 'OPERARIO']);
      expect(roles).not.toContain('PRODUCTOR');
    }
  });

  it('scopes category routes to caller tenant and limits replacement to admin or supervisor', async () => {
    const req = { user: { tenantId: 'tenant-1' } };
    service.findCategories.mockResolvedValue([]);
    service.replaceCategories.mockResolvedValue([]);
    await expect(controller.findCategories('labor-1', req)).resolves.toEqual([]);
    await expect(controller.replaceCategories('labor-1', req, { categoryIds: [] })).resolves.toEqual([]);
    expect(service.findCategories).toHaveBeenCalledWith('labor-1', 'tenant-1');
    expect(service.replaceCategories).toHaveBeenCalledWith('labor-1', 'tenant-1', { categoryIds: [] });
    expect(Reflect.getMetadata(ROLES_KEY, LaborTypeController.prototype.replaceCategories)).toEqual(['ADMIN', 'SUPERVISOR']);
  });

  it('delegates tenant-scoped requests using req.user.tenantId', async () => {
    service.findAll.mockResolvedValue([{ id: 'labor-type-1' }]);
    service.findOne.mockResolvedValue({ id: 'labor-type-1' });
    service.create.mockResolvedValue({ id: 'labor-type-2' });
    service.update.mockResolvedValue({ id: 'labor-type-1', name: 'Nuevo nombre' });
    service.delete.mockResolvedValue({ message: 'deleted' });

    const req = { user: { tenantId: 'tenant-1' } };

    await expect(controller.findAll(req)).resolves.toEqual([{ id: 'labor-type-1' }]);
    await expect(controller.findOne('labor-type-1', req)).resolves.toEqual({
      id: 'labor-type-1',
    });
    await expect(
      controller.create(req, ({ name: 'Nuevo tipo', companyId: 'company-2' } as never)),
    ).resolves.toEqual({ id: 'labor-type-2' });
    await expect(
      controller.update('labor-type-1', req, {
        name: 'Nuevo nombre',
        companyId: 'company-2' as never,
      } as never),
    ).resolves.toEqual({
      id: 'labor-type-1',
      name: 'Nuevo nombre',
    });
    await expect(controller.delete('labor-type-1', req)).resolves.toEqual({
      message: 'deleted',
    });

    expect(service.findAll).toHaveBeenCalledWith('tenant-1');
    expect(service.findOne).toHaveBeenCalledWith('labor-type-1', 'tenant-1');
    expect(service.create).toHaveBeenCalledWith('tenant-1', { name: 'Nuevo tipo' });
    expect(service.update).toHaveBeenCalledWith('labor-type-1', 'tenant-1', {
      name: 'Nuevo nombre',
    });
    expect(service.delete).toHaveBeenCalledWith('labor-type-1', 'tenant-1');
  });
});
