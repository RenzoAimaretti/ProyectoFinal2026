import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { MachineUsageService } from './machine-usage.service';

@Controller('machine-usages')
export class MachineUsageController {
  constructor(private readonly service: MachineUsageService) {}

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
