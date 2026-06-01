import { Module } from '@nestjs/common';
import { CompanyModule } from './entities/company/company.module';
import { ModuleEntityModule } from './entities/module-entity/module-entity.module';
import { FarmModule } from './entities/farm/farm.module';
import { LotModule } from './entities/lot/lot.module';
import { LivestockModule } from './entities/livestock/livestock.module';
import { UserModule } from './entities/user/user.module';
import { LivestockEventModule } from './entities/livestock-event/livestock-event.module';
import { WeightRecordModule } from './entities/weight-record/weight-record.module';


@Module({
  imports: [
    CompanyModule,
    ModuleEntityModule,
    FarmModule,
    LotModule,
    LivestockModule,
    UserModule,
    LivestockEventModule,
    WeightRecordModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
