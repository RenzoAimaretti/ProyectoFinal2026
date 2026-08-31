import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateUserInput, UpdateUserInput } from './application/user.types';
import { UserService } from './user.service';

type RequestWithUser = {
  user: {
    firmaId: string;
  };
};

type CreateUserBody = Omit<CreateUserInput, 'companyId'> & {
  companyId?: string;
};

type UpdateUserBody = UpdateUserInput & {
  companyId?: string;
};

@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAll(req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: RequestWithUser, @Body() data: CreateUserBody) {
    const { companyId: _companyId, ...payload } = data;

    return this.service.create(req.user.firmaId, payload as Omit<CreateUserInput, 'companyId'>);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
    @Body() data: UpdateUserBody,
  ) {
    const { companyId: _companyId, ...payload } = data;

    return this.service.update(id, req.user.firmaId, payload);
  }
}
