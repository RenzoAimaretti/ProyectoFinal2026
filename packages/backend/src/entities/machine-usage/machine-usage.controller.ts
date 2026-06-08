import { Controller, Get, Post, Param, Body, Put } from '@nestjs/common';
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
  create(@Body() data: {machineId: string; taskId: string; operatorId: string; intialFuel:number; }) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: {initialFuel?: number;finalFuel?: number; usageHours?: number; observations?: string;}) {
    return this.service.update(id, data);
  }
}
