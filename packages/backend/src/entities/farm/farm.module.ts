import { Module } from '@nestjs/common';
import { FarmService } from './farm.service';
import { FarmController } from './farm.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { FARM_REPOSITORY } from './ports/farm.repository';
import { PrismaFarmRepository } from './adapters/outbound/prisma/prisma-farm.repository';
import { CompanyModule } from '../company/company.module';

@Module({
  // CompanyModule provee COMPANY_REPOSITORY (puerto exportado por el dueño de la
  // entidad, REQ-F2-03 / D1) para el cross-read de empresa del service.
  imports: [PrismaModule, CompanyModule],
  controllers: [FarmController],
  providers: [
    FarmService,
    { provide: FARM_REPOSITORY, useClass: PrismaFarmRepository },
  ],
  // FARM_REPOSITORY exportado para el cross-read de lot (T-F2-20, REQ-F2-03).
  exports: [FarmService, FARM_REPOSITORY],
})
export class FarmModule {}
