import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateTaskTypeInput, UpdateTaskTypeInput } from './application/task-type.types';
import { TaskTypeService } from './task-type.service';

@Controller('task-types')
export class TaskTypeController {
  constructor(private readonly service: TaskTypeService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() data: CreateTaskTypeInput) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateTaskTypeInput) {
    return this.service.update(id, data);
  }
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
