import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FieldCatalogService } from './field-catalog.service';

type RequestWithUser = {
  user: {
    tenantId: string;
    firmaId: string;
  };
};

/// Catalog read for the mobile field flow (CUU08).
///
/// Additive endpoint: it exposes only the caller's firma, the caller's tenant
/// taxonomy, the firma machines and the tenant tasks with their operator ids.
@Controller('catalog')
export class FieldCatalogController {
  constructor(private readonly service: FieldCatalogService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Get('field')
  findFieldCatalog(@Req() req: RequestWithUser) {
    return this.service.findFieldCatalog(req.user.tenantId, req.user.firmaId);
  }
}
