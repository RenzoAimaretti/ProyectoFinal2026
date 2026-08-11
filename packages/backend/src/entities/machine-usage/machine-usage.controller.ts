import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CreateMachineUsageInput, UpdateMachineUsageInput } from './application/machine-usage.types';
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
  create(@Body() data: CreateMachineUsageInput) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateMachineUsageInput) {
    return this.service.update(id, data);
  }
}
