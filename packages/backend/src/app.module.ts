import { Module } from '@nestjs/common';
import { CompanyModule } from './entities/company/company.module';
import { ClientModule } from './entities/client/client.module';
import { InputModule } from './entities/input/input.module';
import { InputCategoryModule } from './entities/input-category/input-category.module';
import { RecipeModule } from './entities/recipe/recipe.module';
import { DailyReportModule } from './entities/daily-report/daily-report.module';
import { ReceptionModule } from './entities/reception/reception.module';
import { StockModule } from './entities/stock/stock.module';
import { PhotoModule } from './entities/photo/photo.module';
import { MachineActivityModule } from './entities/machine-activity/machine-activity.module';
import { ModuleEntityModule } from './entities/module-entity/module-entity.module';
import { FarmModule } from './entities/farm/farm.module';
import { LotModule } from './entities/lot/lot.module';
import { LivestockModule } from './entities/livestock/livestock.module';
import { UserModule } from './entities/user/user.module';
import { LivestockEventModule } from './entities/livestock-event/livestock-event.module';
import { WeightRecordModule } from './entities/weight-record/weight-record.module';
import { LaborTypeModule } from './entities/labor-type/labor-type.module';
import { TaskModule } from './entities/task/task.module';
import { MachineModule } from './entities/machine/machine.module';
import { MachineUsageModule } from './entities/machine-usage/machine-usage.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './auth/rbac.module';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    CompanyModule,
    ClientModule,
    InputModule,
    InputCategoryModule,
    RecipeModule,
    DailyReportModule,
    ReceptionModule,
    StockModule,
    PhotoModule,
    MachineActivityModule,
    ModuleEntityModule,
    FarmModule,
    LotModule,
    LivestockModule,
    UserModule,
    LivestockEventModule,
    WeightRecordModule,
    LaborTypeModule,
    TaskModule,
    MachineModule,
    MachineUsageModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

