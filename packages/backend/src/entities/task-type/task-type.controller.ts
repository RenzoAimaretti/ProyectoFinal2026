import { Controller, Get, Post, Param, Body, Delete, Put } from '@nestjs/common';
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
  create(@Body() data: {name: string;description?: string;}) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: {name?: string;description?: string; taskIds?: string[]}) {
    return this.service.update(id, data);
  }
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
