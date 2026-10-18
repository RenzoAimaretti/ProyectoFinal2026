import { Body, Controller, ForbiddenException, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateMachineUsageInput, UpdateMachineUsageInput } from './application/machine-usage.types';
import { MachineUsageService } from './machine-usage.service';

type RequestWithUser = {
  user: {
    id: string;
    role: string;
    firmaId: string;
  };
};

@Controller('machine-usages')
export class MachineUsageController {
  constructor(private readonly service: MachineUsageService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAll(req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'OPERARIO')
  @Post()
  create(@Req() req: RequestWithUser, @Body() data: CreateMachineUsageInput) {
    if (req.user.role === 'OPERARIO' && req.user.id !== data?.operatorId) {
      throw new ForbiddenException('Operator may only register their own usage');
    }
    return this.service.create(req.user.firmaId, data, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Put(':id')
  update(@Param('id') id: string, @Req() req: RequestWithUser, @Body() data: UpdateMachineUsageInput) {
    return this.service.update(id, req.user.firmaId, data);
  }
}
