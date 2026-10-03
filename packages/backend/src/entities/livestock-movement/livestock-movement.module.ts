import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  LIVESTOCK_MOVEMENT_REPOSITORY,
  LIVESTOCK_READER,
  LOT_READER,
  LivestockMovementRepositoryPort,
  LivestockReaderPort,
  LotReaderPort,
} from './application/livestock-movement.ports';
import { CreateLivestockMovementUseCase } from './application/use-cases/create-livestock-movement.use-case';
import { FindAllLivestockMovementsUseCase } from './application/use-cases/find-all-livestock-movements.use-case';
import { FindLivestockMovementUseCase } from './application/use-cases/find-livestock-movement.use-case';
import { PrismaLivestockMovementRepository } from './adapters/outbound/prisma-livestock-movement.repository';
import { PrismaLivestockReader } from './adapters/outbound/prisma-livestock.reader';
import { PrismaLotReader } from './adapters/outbound/prisma-lot.reader';
import { LivestockMovementController } from './livestock-movement.controller';
import { LivestockMovementService } from './livestock-movement.service';

@Module({
  imports: [PrismaModule],
  controllers: [LivestockMovementController],
  providers: [
    LivestockMovementService,
    { provide: LIVESTOCK_MOVEMENT_REPOSITORY, useClass: PrismaLivestockMovementRepository },
    { provide: LIVESTOCK_READER, useClass: PrismaLivestockReader },
    { provide: LOT_READER, useClass: PrismaLotReader },
    {
      provide: FindAllLivestockMovementsUseCase,
      useFactory: (repository: LivestockMovementRepositoryPort) =>
        new FindAllLivestockMovementsUseCase(repository),
      inject: [LIVESTOCK_MOVEMENT_REPOSITORY],
    },
    {
      provide: FindLivestockMovementUseCase,
      useFactory: (repository: LivestockMovementRepositoryPort) =>
        new FindLivestockMovementUseCase(repository),
      inject: [LIVESTOCK_MOVEMENT_REPOSITORY],
    },
    {
      provide: CreateLivestockMovementUseCase,
      useFactory: (
        repository: LivestockMovementRepositoryPort,
        livestockReader: LivestockReaderPort,
        lotReader: LotReaderPort,
      ) => new CreateLivestockMovementUseCase(repository, livestockReader, lotReader),
      inject: [LIVESTOCK_MOVEMENT_REPOSITORY, LIVESTOCK_READER, LOT_READER],
    },
  ],
  exports: [LivestockMovementService],
})
export class LivestockMovementModule {}
