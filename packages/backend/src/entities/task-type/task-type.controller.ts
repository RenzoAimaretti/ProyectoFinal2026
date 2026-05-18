import { Controller, Get, Post, Param, Body } from '@nestjs/common';
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
  create(@Body() data: any) {
    return this.service.create(data);
  }
}
