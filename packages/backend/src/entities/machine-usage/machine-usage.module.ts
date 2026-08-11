import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MACHINE_READER, MACHINE_USAGE_REPOSITORY, TASK_READER, USER_READER, MachineReaderPort, MachineUsageRepositoryPort, TaskReaderPort, UserReaderPort } from './application/machine-usage.ports';
import { CreateMachineUsageUseCase } from './application/use-cases/create-machine-usage.use-case';
import { FindAllMachineUsagesUseCase } from './application/use-cases/find-all-machine-usages.use-case';
import { FindMachineUsageUseCase } from './application/use-cases/find-machine-usage.use-case';
import { UpdateMachineUsageUseCase } from './application/use-cases/update-machine-usage.use-case';
import { PrismaMachineReader } from './adapters/outbound/prisma-machine.reader';
import { PrismaMachineUsageRepository } from './adapters/outbound/prisma-machine-usage.repository';
import { PrismaTaskReader } from './adapters/outbound/prisma-task.reader';
import { PrismaUserReader } from './adapters/outbound/prisma-user.reader';
import { MachineUsageController } from './machine-usage.controller';
import { MachineUsageService } from './machine-usage.service';

@Module({
  imports: [PrismaModule],
  controllers: [MachineUsageController],
  providers: [
    MachineUsageService,
    { provide: MACHINE_USAGE_REPOSITORY, useClass: PrismaMachineUsageRepository },
    { provide: MACHINE_READER, useClass: PrismaMachineReader },
    { provide: TASK_READER, useClass: PrismaTaskReader },
    { provide: USER_READER, useClass: PrismaUserReader },
    {
      provide: FindAllMachineUsagesUseCase,
      useFactory: (repository: MachineUsageRepositoryPort) => new FindAllMachineUsagesUseCase(repository),
      inject: [MACHINE_USAGE_REPOSITORY],
    },
    {
      provide: FindMachineUsageUseCase,
      useFactory: (repository: MachineUsageRepositoryPort) => new FindMachineUsageUseCase(repository),
      inject: [MACHINE_USAGE_REPOSITORY],
    },
    {
      provide: CreateMachineUsageUseCase,
      useFactory: (
        repository: MachineUsageRepositoryPort,
        machineReader: MachineReaderPort,
        taskReader: TaskReaderPort,
        userReader: UserReaderPort,
      ) => new CreateMachineUsageUseCase(repository, machineReader, taskReader, userReader),
      inject: [MACHINE_USAGE_REPOSITORY, MACHINE_READER, TASK_READER, USER_READER],
    },
    {
      provide: UpdateMachineUsageUseCase,
      useFactory: (repository: MachineUsageRepositoryPort) => new UpdateMachineUsageUseCase(repository),
      inject: [MACHINE_USAGE_REPOSITORY],
    },
  ],
  exports: [MachineUsageService],
})
export class MachineUsageModule {}
