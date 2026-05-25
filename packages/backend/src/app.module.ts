import { Module } from '@nestjs/common';
import { CompanyModule } from './entities/company/company.module';
import { ModuleEntityModule } from './entities/module-entity/module-entity.module';
import { FarmModule } from './entities/farm/farm.module';
import { LotModule } from './entities/lot/lot.module';


@Module({
  imports: [
    CompanyModule,
    ModuleEntityModule,
    FarmModule,
    LotModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
