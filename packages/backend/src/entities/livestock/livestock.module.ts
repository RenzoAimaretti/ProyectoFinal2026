import { Module } from '@nestjs/common';
import { LivestockService } from './livestock.service';
import { LivestockController } from './livestock.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { LIVESTOCK_REPOSITORY } from './ports/livestock.repository';
import { COMPANY_LOOKUP } from './ports/company-lookup.port';
import { LOT_LOOKUP } from './ports/lot-lookup.port';
import { PrismaLivestockRepository } from './adapters/outbound/prisma/prisma-livestock.repository';
import { PrismaCompanyLookup } from './adapters/outbound/prisma/prisma-company-lookup';
import { PrismaLotLookup } from './adapters/outbound/prisma/prisma-lot-lookup';

@Module({
  imports: [PrismaModule],
  controllers: [LivestockController],
  providers: [
    LivestockService,
    { provide: LIVESTOCK_REPOSITORY, useClass: PrismaLivestockRepository },
    { provide: COMPANY_LOOKUP, useClass: PrismaCompanyLookup },
    { provide: LOT_LOOKUP, useClass: PrismaLotLookup },
  ],
  exports: [LivestockService, LIVESTOCK_REPOSITORY],
})
export class LivestockModule {}
