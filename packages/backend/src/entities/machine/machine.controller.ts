import { Controller, Get, Post, Param, Body, Put } from '@nestjs/common';
import { MachineService } from './machine.service';
// T-F2-56: el controller NO importa prisma (exención solo para adapters) — el
// DTO usa el enum de dominio; en runtime ambos son los mismos strings.
import { MachineStatus } from './domain/machine-status';

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
  create(
    @Body()
    data: {
      companyId: string;
      name: string;
      brand: string;
      entryDate: string;
    },
  ) {
    return this.service.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      brand?: string;
      entryDate?: string;
      status?: MachineStatus;
      maintenanceDate?: string;
    },
  ) {
    return this.service.update(id, data);
  }
  //no va un delete pues no se borra una máquina, se le pone una baja logica
}
