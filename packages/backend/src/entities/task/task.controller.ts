import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateTaskInput, UpdateTaskInput } from './application/task.types';
import { TaskService } from './task.service';

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
  create(@Body() data: CreateTaskInput) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateTaskInput) {
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
