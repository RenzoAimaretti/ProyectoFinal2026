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
import { MaintenanceThresholdModule } from './entities/maintenance-threshold/maintenance-threshold.module';
import { MachineReportModule } from './entities/machine-report/machine-report.module';
import { FieldCatalogModule } from './entities/field-catalog/field-catalog.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './auth/rbac.module';
import { WeatherModule } from './integrations/weather/weather.module';
import { ExchangeRateModule } from './integrations/exchange-rate/exchange-rate.module';
import { GrainPriceModule } from './integrations/grain-price/grain-price.module';
import { ValuationModule } from './entities/valuation/valuation.module';
import { TariffModule } from './entities/tariff/tariff.module';
import { ExpenseCategoryModule } from './entities/expense-category/expense-category.module';
import { ExpenseModule } from './entities/expense/expense.module';

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
    // Registered before MachineModule so `GET /machines/alerts` wins over
    // `GET /machines/:id`.
    MaintenanceThresholdModule,
    MachineModule,
    MachineUsageModule,
    WeatherModule,
    ExchangeRateModule,
    GrainPriceModule,
    MachineReportModule,
    FieldCatalogModule,
    ValuationModule,
    TariffModule,
    ExpenseCategoryModule,
    ExpenseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

