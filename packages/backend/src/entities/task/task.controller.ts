import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateTaskInput, UpdateTaskInput } from './application/task.types';
import { TaskService } from './task.service';

type RequestWithUser = {
  user: {
    tenantId: string;
  };
};

@Controller('tasks')
export class TaskController {
  constructor(private readonly service: TaskService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: RequestWithUser, @Body() data: CreateTaskInput) {
    return this.service.create(req.user.tenantId, {
      lotId: data.lotId,
      taskTypeId: data.taskTypeId,
      startedAt: data.startedAt,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Req() req: RequestWithUser, @Body() data: UpdateTaskInput) {
    return this.service.update(id, req.user.tenantId, {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.startedAt !== undefined ? { startedAt: data.startedAt } : {}),
      ...(data.finishedAt !== undefined ? { finishedAt: data.finishedAt } : {}),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/:operatorId')
  addOperario(
    @Param('id') taskId: string,
    @Param('operatorId') operatorId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.addOperario(taskId, operatorId, req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/:operatorId')
  removeOperario(
    @Param('id') taskId: string,
    @Param('operatorId') operatorId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.removeOperario(taskId, operatorId, req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.delete(id, req.user.tenantId);
  }
}
