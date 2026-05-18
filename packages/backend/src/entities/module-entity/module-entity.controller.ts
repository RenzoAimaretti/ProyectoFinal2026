import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ModuleEntityService } from './module-entity.service';

@Controller('modules')
export class ModuleEntityController {
  constructor(private readonly service: ModuleEntityService) {}

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
