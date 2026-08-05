import { Module } from '@nestjs/common';
import { CompanyModule } from './entities/company/company.module';
import { ModuleEntityModule } from './entities/module-entity/module-entity.module';
import { FarmModule } from './entities/farm/farm.module';
import { LotModule } from './entities/lot/lot.module';
import { LivestockModule } from './entities/livestock/livestock.module';
import { UserModule } from './entities/user/user.module';
import { LivestockEventModule } from './entities/livestock-event/livestock-event.module';
import { WeightRecordModule } from './entities/weight-record/weight-record.module';
import { TaskTypeModule } from './entities/task-type/task-type.module';
import { TaskModule } from './entities/task/task.module';
import { MachineModule } from './entities/machine/machine.module';
import { MachineUsageModule } from './entities/machine-usage/machine-usage.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    AuthModule,
    CompanyModule,
    ModuleEntityModule,
    FarmModule,
    LotModule,
    LivestockModule,
    UserModule,
    LivestockEventModule,
    WeightRecordModule,
    TaskTypeModule,
    TaskModule,
    MachineModule,
    MachineUsageModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
