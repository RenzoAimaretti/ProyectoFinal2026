import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CompanyService } from './company.service';

type RequestWithUser = {
  user: {
    tenantId: string;
  };
};

type CreateCompanyBody = {
  name: string;
  cuit: string;
};

type UpdateCompanyBody = {
  name?: string;
  nombre?: string;
  cuit?: string;
  active?: boolean;
  estado?: boolean | string;
};

type AddModuleBody = {
  companyId: string;
  moduleId: string;
};

@Controller('companies')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  create(@Req() req: RequestWithUser, @Body() data: CreateCompanyBody) {
    return this.service.create({
      tenantId: req.user.tenantId,
      name: data.name,
      cuit: data.cuit,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() data: UpdateCompanyBody,
  ) {
    return this.service.update(id, req.user.tenantId, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.nombre !== undefined ? { name: data.nombre } : {}),
      ...(data.cuit !== undefined ? { cuit: data.cuit } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.estado !== undefined
        ? {
            active:
              typeof data.estado === 'boolean'
                ? data.estado
                : ['true', '1', 'activo', 'active'].includes(
                    data.estado.toLowerCase(),
                  ),
          }
        : {}),
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post('/add-module')
  addModule(@Req() req: RequestWithUser, @Body() data: AddModuleBody) {
    return this.service.addModule(
      data.companyId,
      req.user.tenantId,
      data.moduleId,
    );
  }
}
