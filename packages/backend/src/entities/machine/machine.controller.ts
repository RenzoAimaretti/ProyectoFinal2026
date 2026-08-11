import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CreateMachineInput, UpdateMachineInput } from './application/machine.types';
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
  create(@Body() data: CreateMachineInput) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateMachineInput) {
    return this.service.update(id, data);
  }
  //no va un delete pues no se borra una máquina, se le pone una baja logica
}
