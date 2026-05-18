import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { MachineService } from './machine.service';

@Controller('machines')
export class MachineController {
  constructor(private readonly service: MachineService) {}

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
