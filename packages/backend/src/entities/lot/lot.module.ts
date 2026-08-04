import { Module } from '@nestjs/common';
import { LotService } from './lot.service';
import { LotController } from './lot.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { LOT_REPOSITORY } from './ports/lot.repository';
import { PrismaLotRepository } from './adapters/outbound/prisma/prisma-lot.repository';
import { FarmModule } from '../farm/farm.module';
import { CompanyModule } from '../company/company.module';
import { LivestockModule } from '../livestock/livestock.module';

@Module({
  // FarmModule/CompanyModule/LivestockModule proveen FARM_REPOSITORY,
  // COMPANY_REPOSITORY y LIVESTOCK_REPOSITORY (puertos exportados por sus
  // dueños, REQ-F2-03 / D1) para los cross-reads del service (T-F2-20).
  imports: [PrismaModule, FarmModule, CompanyModule, LivestockModule],
  controllers: [LotController],
  providers: [
    LotService,
    { provide: LOT_REPOSITORY, useClass: PrismaLotRepository },
  ],
  // LOT_REPOSITORY exportado para el cross-read del livestock swap (T-F2-23,
  // REQ-F2-03): el service de livestock escribirá el side lot vía este puerto.
  exports: [LotService, LOT_REPOSITORY],
})
export class LotModule {}
