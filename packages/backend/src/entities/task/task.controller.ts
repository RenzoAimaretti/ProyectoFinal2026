import { Controller, Get, Post, Param, Body, Put, Delete } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskStatus } from '../../../prisma/generated/enums';

@Controller('tasks')
export class TaskController {
  constructor(private readonly service: TaskService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() data: {lotId:string;taskTypeId:string; startedAt:string;}) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: {status?: TaskStatus; startedAt?: string; finishedAt?: string;}) {
    return this.service.update(id, data);
  }

  @Post(':id/:operatorId')
  addOperario(@Param('id') taskId: string, @Param('operatorId') operatorId: string) {
    return this.service.addOperario(taskId, operatorId);
  }

  @Put(':id/:operatorId')
  removeOperario(@Param('id') taskId: string, @Param('operatorId') operatorId: string) {
    return this.service.removeOperario(taskId, operatorId);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
