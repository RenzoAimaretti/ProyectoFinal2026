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
  // T-F2-62: el body typea `initialFuel` (no el typo legacy `intialFuel`) — el
  // service espera CreateMachineUsageData con el nombre correcto del schema.
  create(
    @Body()
    data: {
      machineId: string;
      taskId: string;
      operatorId: string;
      initialFuel: number;
    },
  ) {
    return this.service.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    data: {
      initialFuel?: number;
      finalFuel?: number;
      usageHours?: number;
      observations?: string;
    },
  ) {
    return this.service.update(id, data);
  }
}
