import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { LivestockService } from './livestock.service';

@Controller('livestocks')
export class LivestockController {
  constructor(private readonly service: LivestockService) {}

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
