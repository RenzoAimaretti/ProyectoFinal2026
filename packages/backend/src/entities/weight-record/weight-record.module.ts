import { Module } from '@nestjs/common';
import { WeightRecordService } from './weight-record.service';
import { WeightRecordController } from './weight-record.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { WEIGHT_RECORD_REPOSITORY } from './ports/weight-record.repository';
import { PrismaWeightRecordRepository } from './adapters/outbound/prisma/prisma-weight-record.repository';
import { UserModule } from '../user/user.module';
import { LivestockModule } from '../livestock/livestock.module';

@Module({
  // T-F2-39 (D1): cross-reads vía los puertos exportados por sus dueños —
  // USER_REPOSITORY (wave 3) y LIVESTOCK_REPOSITORY (wave 1), REQ-F2-03.
  imports: [PrismaModule, UserModule, LivestockModule],
  controllers: [WeightRecordController],
  providers: [
    WeightRecordService,
    {
      provide: WEIGHT_RECORD_REPOSITORY,
      useClass: PrismaWeightRecordRepository,
    },
  ],
  exports: [WeightRecordService, WEIGHT_RECORD_REPOSITORY],
})
export class WeightRecordModule {}
