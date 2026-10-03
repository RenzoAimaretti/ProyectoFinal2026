import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateFarmInput, UpdateFarmInput } from './application/farm.types';
import { FarmService } from './farm.service';

type RequestWithUser = {
  user: {
    id: string;
    tenantId: string;
    role: string;
  };
};

@Controller('farms')
export class FarmController {
  constructor(private readonly service: FarmService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAllForUser(
      req.user.tenantId,
      req.user.id,
      req.user.role,
    );
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
  create(@Req() req: RequestWithUser, @Body() data: CreateFarmInput) {
    return this.service.create(req.user.tenantId, {
      name: data.name,
      location: data.location,
      surface: data.surface,
      clientId: data.clientId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() data: UpdateFarmInput,
  ) {
    return this.service.update(id, req.user.tenantId, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.surface !== undefined ? { surface: data.surface } : {}),
      ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
    });
  }
}
