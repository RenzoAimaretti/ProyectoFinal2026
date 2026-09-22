import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CLIENT_READER,
  FARM_REPOSITORY,
  ClientReaderPort,
  FarmRepositoryPort,
} from './application/farm.ports';
import { CreateFarmUseCase } from './application/use-cases/create-farm.use-case';
import { FindAllFarmsUseCase } from './application/use-cases/find-all-farms.use-case';
import { FindFarmUseCase } from './application/use-cases/find-farm.use-case';
import { UpdateFarmUseCase } from './application/use-cases/update-farm.use-case';
import { PrismaClientReader } from './adapters/outbound/prisma-client.reader';
import { PrismaFarmRepository } from './adapters/outbound/prisma-farm.repository';
import { FarmController } from './farm.controller';
import { FarmService } from './farm.service';

@Module({
  imports: [PrismaModule],
  controllers: [FarmController],
  providers: [
    FarmService,
    JwtAuthGuard,
    PrismaFarmRepository,
    PrismaClientReader,
    { provide: FARM_REPOSITORY, useExisting: PrismaFarmRepository },
    { provide: CLIENT_READER, useExisting: PrismaClientReader },
    {
      provide: FindAllFarmsUseCase,
      useFactory: (repository: FarmRepositoryPort) =>
        new FindAllFarmsUseCase(repository),
      inject: [FARM_REPOSITORY],
    },
    {
      provide: FindFarmUseCase,
      useFactory: (repository: FarmRepositoryPort) =>
        new FindFarmUseCase(repository),
      inject: [FARM_REPOSITORY],
    },
    {
      provide: CreateFarmUseCase,
      useFactory: (
        repository: FarmRepositoryPort,
        clientReader: ClientReaderPort,
      ) => new CreateFarmUseCase(repository, clientReader),
      inject: [FARM_REPOSITORY, CLIENT_READER],
    },
    {
      provide: UpdateFarmUseCase,
      useFactory: (
        repository: FarmRepositoryPort,
        clientReader: ClientReaderPort,
      ) => new UpdateFarmUseCase(repository, clientReader),
      inject: [FARM_REPOSITORY, CLIENT_READER],
    },
  ],
  exports: [FarmService],
})
export class FarmModule {}
