import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateTaskTypeInput, UpdateTaskTypeInput } from './application/task-type.types';
import { TaskTypeService } from './task-type.service';

type RequestWithUser = {
  user: {
    firmaId: string;
  };
};

@Controller('task-types')
export class TaskTypeController {
  constructor(private readonly service: TaskTypeService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAll(req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.firmaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: RequestWithUser, @Body() data: CreateTaskTypeInput) {
    return this.service.create(req.user.firmaId, {
      name: data.name,
      ...(data.description !== undefined ? { description: data.description } : {}),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Req() req: RequestWithUser, @Body() data: UpdateTaskTypeInput) {
    return this.service.update(id, req.user.firmaId, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.taskIds !== undefined ? { taskIds: data.taskIds } : {}),
    });
  }
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.delete(id, req.user.firmaId);
  }
}
