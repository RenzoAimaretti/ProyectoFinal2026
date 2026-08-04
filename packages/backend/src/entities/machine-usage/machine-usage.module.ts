import { Module } from '@nestjs/common';
import { MachineUsageService } from './machine-usage.service';
import { MachineUsageController } from './machine-usage.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MACHINE_USAGE_REPOSITORY } from './ports/machine-usage.repository';
import { PrismaMachineUsageRepository } from './adapters/outbound/prisma/prisma-machine-usage.repository';
import { MachineModule } from '../machine/machine.module';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';

@Module({
  // Los módulos dueños exportan los puertos (MACHINE_REPOSITORY, TASK_REPOSITORY,
  // USER_REPOSITORY) para los cross-reads del service (REQ-F2-03 / D1).
  imports: [PrismaModule, MachineModule, TaskModule, UserModule],
  controllers: [MachineUsageController],
  providers: [
    MachineUsageService,
    {
      provide: MACHINE_USAGE_REPOSITORY,
      useClass: PrismaMachineUsageRepository,
    },
  ],
  exports: [MachineUsageService, MACHINE_USAGE_REPOSITORY],
})
export class MachineUsageModule {}
