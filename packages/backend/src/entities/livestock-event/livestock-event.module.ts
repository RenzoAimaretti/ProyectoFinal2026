import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  LIVESTOCK_EVENT_REPOSITORY,
  LIVESTOCK_READER,
  USER_READER,
  LivestockEventRepositoryPort,
  LivestockReaderPort,
  UserReaderPort,
} from './application/livestock-event.ports';
import { CreateLivestockEventUseCase } from './application/use-cases/create-livestock-event.use-case';
import { FindAllLivestockEventsUseCase } from './application/use-cases/find-all-livestock-events.use-case';
import { FindLivestockEventUseCase } from './application/use-cases/find-livestock-event.use-case';
import { UpdateLivestockEventUseCase } from './application/use-cases/update-livestock-event.use-case';
import { PrismaLivestockEventRepository } from './adapters/outbound/prisma-livestock-event.repository';
import { PrismaLivestockReader } from './adapters/outbound/prisma-livestock.reader';
import { PrismaUserReader } from './adapters/outbound/prisma-user.reader';
import { LivestockEventController } from './livestock-event.controller';
import { LivestockEventService } from './livestock-event.service';

@Module({
  imports: [PrismaModule],
  controllers: [LivestockEventController],
  providers: [
    LivestockEventService,
    { provide: LIVESTOCK_EVENT_REPOSITORY, useClass: PrismaLivestockEventRepository },
    { provide: LIVESTOCK_READER, useClass: PrismaLivestockReader },
    { provide: USER_READER, useClass: PrismaUserReader },
    {
      provide: FindAllLivestockEventsUseCase,
      useFactory: (repository: LivestockEventRepositoryPort) =>
        new FindAllLivestockEventsUseCase(repository),
      inject: [LIVESTOCK_EVENT_REPOSITORY],
    },
    {
      provide: FindLivestockEventUseCase,
      useFactory: (repository: LivestockEventRepositoryPort) =>
        new FindLivestockEventUseCase(repository),
      inject: [LIVESTOCK_EVENT_REPOSITORY],
    },
    {
      provide: CreateLivestockEventUseCase,
      useFactory: (
        repository: LivestockEventRepositoryPort,
        livestockReader: LivestockReaderPort,
        userReader: UserReaderPort,
      ) => new CreateLivestockEventUseCase(repository, livestockReader, userReader),
      inject: [LIVESTOCK_EVENT_REPOSITORY, LIVESTOCK_READER, USER_READER],
    },
    {
      provide: UpdateLivestockEventUseCase,
      useFactory: (
        repository: LivestockEventRepositoryPort,
        livestockReader: LivestockReaderPort,
        userReader: UserReaderPort,
      ) => new UpdateLivestockEventUseCase(repository, livestockReader, userReader),
      inject: [LIVESTOCK_EVENT_REPOSITORY, LIVESTOCK_READER, USER_READER],
    },
  ],
  exports: [LivestockEventService],
})
export class LivestockEventModule {}
