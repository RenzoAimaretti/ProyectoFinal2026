import { Controller, Get, Post, Param, Body } from '@nestjs/common';
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
  create(@Body() data: any) {
    return this.service.create(data);
  }
}
