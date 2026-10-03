import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { LivestockMovementService } from './livestock-movement.service';
import { CreateLivestockMovementInput } from './application/livestock-movement.types';

type RequestWithUser = {
  user: {
    firmaId: string;
  };
};

type CreateLivestockMovementBody = Omit<CreateLivestockMovementInput, 'companyId'> & {
  companyId?: string;
};

@Controller('livestock-movements')
export class LivestockMovementController {
  constructor(private readonly service: LivestockMovementService) {}

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
  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  create(@Req() req: RequestWithUser, @Body() data: CreateLivestockMovementBody) {
    const { companyId: _companyId, ...payload } = data;

    return this.service.create(req.user.firmaId, payload as CreateLivestockMovementInput);
  }
}
