import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { UserRole } from './domain/user-role';
import { UserService } from './user.service';

type CreateUserBody = {
  companyId: string;
  username?: string;
  email?: string;
  password: string;
  role: UserRole;
  active?: boolean;
};

@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() data: CreateUserBody) {
    return this.service.create(data);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Partial<CreateUserBody>,
  ) {
    return this.service.update(id, data);
  }
}
