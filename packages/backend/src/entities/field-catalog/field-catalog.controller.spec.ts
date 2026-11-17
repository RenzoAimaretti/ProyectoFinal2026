import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { FieldCatalogController } from './field-catalog.controller';
import { FieldCatalogService } from './field-catalog.service';

describe('FieldCatalogController', () => {
  let controller: FieldCatalogController;
  const service = { findFieldCatalog: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [FieldCatalogController],
      providers: [{ provide: FieldCatalogService, useValue: service }],
    }).compile();
    controller = module.get(FieldCatalogController);
  });

  it('protects the catalog with JWT and roles', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      FieldCatalogController.prototype.findFieldCatalog,
    ) as Array<new (...args: never[]) => unknown>;
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        FieldCatalogController.prototype.findFieldCatalog,
      ),
    ).toEqual(['ADMIN', 'SUPERVISOR', 'OPERARIO']);
  });

  it('scopes the catalog to the caller tenant and firma', async () => {
    service.findFieldCatalog.mockResolvedValue({ tasks: [] });

    await expect(
      controller.findFieldCatalog({
        user: { tenantId: 'tenant-1', firmaId: 'company-1' },
      }),
    ).resolves.toEqual({ tasks: [] });

    expect(service.findFieldCatalog).toHaveBeenCalledWith(
      'tenant-1',
      'company-1',
    );
  });
});
