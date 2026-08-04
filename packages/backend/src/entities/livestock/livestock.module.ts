import { Module, forwardRef } from '@nestjs/common';
import { LivestockService } from './livestock.service';
import { LivestockController } from './livestock.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { LIVESTOCK_REPOSITORY } from './ports/livestock.repository';
import { PrismaLivestockRepository } from './adapters/outbound/prisma/prisma-livestock.repository';
import { CompanyModule } from '../company/company.module';
import { FarmModule } from '../farm/farm.module';
import { LotModule } from '../lot/lot.module';

@Module({
  // T-F2-23 (D1): COMPANY_LOOKUP/LOT_LOOKUP (capacidad angosta del piloto F1) se
  // reemplazan por los puertos exportados por sus dueños — COMPANY_REPOSITORY,
  // FARM_REPOSITORY y LOT_REPOSITORY (REQ-F2-03). forwardRef(LotModule) rompe el
  // ciclo livestock ↔ lot (lot.module importa LivestockModule para
  // LIVESTOCK_REPOSITORY del addLiveStock, T-F2-20).
  imports: [
    PrismaModule,
    CompanyModule,
    FarmModule,
    forwardRef(() => LotModule),
  ],
  controllers: [LivestockController],
  providers: [
    LivestockService,
    { provide: LIVESTOCK_REPOSITORY, useClass: PrismaLivestockRepository },
  ],
  exports: [LivestockService, LIVESTOCK_REPOSITORY],
})
export class LivestockModule {}
