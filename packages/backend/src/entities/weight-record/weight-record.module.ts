import { Module } from '@nestjs/common';
import { WeightRecordService } from './weight-record.service';
import { WeightRecordController } from './weight-record.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WeightRecordController],
  providers: [WeightRecordService],
  exports: [WeightRecordService],
})
export class WeightRecordModule {}
