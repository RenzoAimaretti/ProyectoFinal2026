import { Module } from '@nestjs/common';
import { MachineUsageService } from './machine-usage.service';
import { MachineUsageController } from './machine-usage.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MachineUsageController],
  providers: [MachineUsageService],
  exports: [MachineUsageService],
})
export class MachineUsageModule {}
