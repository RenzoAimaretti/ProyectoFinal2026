import { Module } from '@nestjs/common';
import { MachineService } from './machine.service';
import { MachineController } from './machine.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MACHINE_REPOSITORY } from './ports/machine.repository';
import { PrismaMachineRepository } from './adapters/outbound/prisma/prisma-machine.repository';
import { CompanyModule } from '../company/company.module';

@Module({
  // CompanyModule provee COMPANY_REPOSITORY (puerto exportado por el dueño de la
  // entidad, REQ-F2-03 / D1) para el cross-read de empresa del service.
  imports: [PrismaModule, CompanyModule],
  controllers: [MachineController],
  providers: [
    MachineService,
    { provide: MACHINE_REPOSITORY, useClass: PrismaMachineRepository },
  ],
  // MACHINE_REPOSITORY exportado para el cross-read de machine-usage
  // (T-F2-61, REQ-F2-03).
  exports: [MachineService, MACHINE_REPOSITORY],
})
export class MachineModule {}
