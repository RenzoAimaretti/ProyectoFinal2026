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
import { CreateLotInput, UpdateLotInput } from './application/lot.types';
import { LotService } from './lot.service';

type RequestWithUser = {
  user: {
    id: string;
    tenantId: string;
    role: string;
  };
};

@Controller('lots')
export class LotController {
  constructor(private readonly service: LotService) {}

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
  create(@Req() req: RequestWithUser, @Body() data: CreateLotInput) {
    return this.service.create(req.user.tenantId, {
      name: data.name,
      farmId: data.farmId,
      coords: data.coords,
      area: data.area,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() data: UpdateLotInput,
  ) {
    return this.service.update(id, req.user.tenantId, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.farmId !== undefined ? { farmId: data.farmId } : {}),
      ...(data.coords !== undefined ? { coords: data.coords } : {}),
      ...(data.area !== undefined ? { area: data.area } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    });
  }
}
