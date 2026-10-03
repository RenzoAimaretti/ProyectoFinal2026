import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateUserInput, UpdateUserInput } from './application/user.types';
import { UserService } from './user.service';

type RequestWithUser = {
  user: {
    tenantId: string;
  };
};

type CreateUserBody = Omit<CreateUserInput, 'tenantId'> & {
  tenantId?: string;
};

type UpdateUserBody = UpdateUserInput & {
  tenantId?: string;
};

@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  create(@Req() req: RequestWithUser, @Body() data: CreateUserBody) {
    const { tenantId: _tenantId, ...payload } = data;

    return this.service.create(req.user.tenantId, payload as Omit<CreateUserInput, 'tenantId'>);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
    @Body() data: UpdateUserBody,
  ) {
    const { tenantId: _tenantId, ...payload } = data;

    return this.service.update(id, req.user.tenantId, payload);
  }
}
