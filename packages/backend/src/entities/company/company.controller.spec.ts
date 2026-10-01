import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

describe('CompanyController', () => {
  let controller: CompanyController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    addModule: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      addModule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [{ provide: CompanyService, useValue: service }],
    }).compile();

    controller = module.get(CompanyController);
  });

  it('protects every route with JwtAuthGuard', () => {
    const methods = [
      'findAll',
      'findOne',
      'create',
      'update',
      'addModule',
    ] as const;

    for (const method of methods) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        CompanyController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('delegates tenant-scoped requests using req.user.tenantId', async () => {
    service.findAll.mockResolvedValue([{ id: 'company-1' }]);
    service.findOne.mockResolvedValue({ id: 'company-1' });
    service.create.mockResolvedValue({ id: 'company-2' });
    service.update.mockResolvedValue({ id: 'company-1', name: 'Updated' });
    service.addModule.mockResolvedValue({ message: 'added' });

    const req = { user: { tenantId: 'tenant-1' } };

    await expect(controller.findAll(req)).resolves.toEqual([{ id: 'company-1' }]);
    await expect(controller.findOne('company-1', req)).resolves.toEqual({
      id: 'company-1',
    });
    await expect(
      controller.create(req, {
        name: 'Agrolify SA',
        cuit: '30-12345678-9',
      }),
    ).resolves.toEqual({ id: 'company-2' });
    await expect(
      controller.update('company-1', req, { name: 'Updated' }),
    ).resolves.toEqual({ id: 'company-1', name: 'Updated' });
    await expect(
      controller.addModule(req, { companyId: 'company-1', moduleId: 'module-1' }),
    ).resolves.toEqual({ message: 'added' });

    expect(service.findAll).toHaveBeenCalledWith('tenant-1');
    expect(service.findOne).toHaveBeenCalledWith('company-1', 'tenant-1');
    expect(service.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      name: 'Agrolify SA',
      cuit: '30-12345678-9',
    });
    expect(service.update).toHaveBeenCalledWith('company-1', 'tenant-1', {
      name: 'Updated',
    });
    expect(service.addModule).toHaveBeenCalledWith(
      'company-1',
      'tenant-1',
      'module-1',
    );
  });
});
