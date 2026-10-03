import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  CLOCK,
  MACHINE_ACTIVITY_MACHINE_READER,
  MACHINE_ACTIVITY_REPOSITORY,
  ClockPort,
  MachineActivityRepositoryPort,
  MachineReaderPort,
} from './application/machine-activity.ports';
import { FindAllMachineActivitiesUseCase } from './application/use-cases/find-all-machine-activities.use-case';
import { FindMachineActivityUseCase } from './application/use-cases/find-machine-activity.use-case';
import { RegisterMachineActivityUseCase } from './application/use-cases/register-machine-activity.use-case';
import { MachineActivityController } from './adapters/inbound/machine-activity.controller';
import { PrismaMachineActivityRepository } from './adapters/outbound/prisma-machine-activity.repository';
import { PrismaMachineReader } from './adapters/outbound/prisma-machine.reader';
import { SystemClock } from './adapters/outbound/system-clock';

@Module({
  imports: [PrismaModule],
  controllers: [MachineActivityController],
  providers: [
    PrismaMachineActivityRepository,
    PrismaMachineReader,
    SystemClock,
    {
      provide: MACHINE_ACTIVITY_REPOSITORY,
      useExisting: PrismaMachineActivityRepository,
    },
    {
      provide: MACHINE_ACTIVITY_MACHINE_READER,
      useExisting: PrismaMachineReader,
    },
    { provide: CLOCK, useExisting: SystemClock },
    {
      provide: FindAllMachineActivitiesUseCase,
      useFactory: (repository: MachineActivityRepositoryPort) =>
        new FindAllMachineActivitiesUseCase(repository),
      inject: [MACHINE_ACTIVITY_REPOSITORY],
    },
    {
      provide: FindMachineActivityUseCase,
      useFactory: (repository: MachineActivityRepositoryPort) =>
        new FindMachineActivityUseCase(repository),
      inject: [MACHINE_ACTIVITY_REPOSITORY],
    },
    {
      provide: RegisterMachineActivityUseCase,
      useFactory: (
        repository: MachineActivityRepositoryPort,
        machineReader: MachineReaderPort,
        clock: ClockPort,
      ) => new RegisterMachineActivityUseCase(repository, machineReader, clock),
      inject: [
        MACHINE_ACTIVITY_REPOSITORY,
        MACHINE_ACTIVITY_MACHINE_READER,
        CLOCK,
      ],
    },
  ],
  exports: [
    FindAllMachineActivitiesUseCase,
    FindMachineActivityUseCase,
    RegisterMachineActivityUseCase,
  ],
})
export class MachineActivityModule {}
