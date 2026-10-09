import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateLaborTypeInput, UpdateLaborTypeInput } from './application/labor-type.types';
import { LaborTypeService } from './labor-type.service';

type RequestWithUser = {
  user: {
    tenantId: string;
  };
};

@Controller('labor-types')
export class LaborTypeController {
  constructor(private readonly service: LaborTypeService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  create(@Req() req: RequestWithUser, @Body() data: CreateLaborTypeInput) {
    return this.service.create(req.user.tenantId, {
      name: data.name,
      ...(data.description !== undefined ? { description: data.description } : {}),
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Put(':id')
  update(@Param('id') id: string, @Req() req: RequestWithUser, @Body() data: UpdateLaborTypeInput) {
    return this.service.update(id, req.user.tenantId, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.taskIds !== undefined ? { taskIds: data.taskIds } : {}),
    });
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.delete(id, req.user.tenantId);
  }
}
