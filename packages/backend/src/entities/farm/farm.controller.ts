import { Controller, Get, Post, Param, Body, Put } from '@nestjs/common';
import { FarmService } from './farm.service';

@Controller('farms')
export class FarmController {
  constructor(private readonly service: FarmService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() data: {name: string; location: string; companyId: string;surface: number;}) {
    return this.service.create(data);
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() data: {name?: string; location?: string; companyId?: string; surface?: number;}) {
    return this.service.update(id, data);
  }
}
