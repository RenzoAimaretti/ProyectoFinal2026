import { Module } from '@nestjs/common';
import { CompanyModule } from './entities/company/company.module';
import { ModuleEntityModule } from './entities/module-entity/module-entity.module';
import { FarmModule } from './entities/farm/farm.module';
import { LotModule } from './entities/lot/lot.module';
import { LivestockModule } from './entities/livestock/livestock.module';
import { UserModule } from './entities/user/user.module';


@Module({
  imports: [
    CompanyModule,
    ModuleEntityModule,
    FarmModule,
    LotModule,
    LivestockModule,
    UserModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
