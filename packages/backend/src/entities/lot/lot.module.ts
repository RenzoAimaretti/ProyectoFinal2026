import { Module } from '@nestjs/common';
import { LotService } from './lot.service';
import { LotController } from './lot.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaLotRepository } from './adapters/outbound/prisma-lot.repository';
import { PrismaFarmReader } from './adapters/outbound/prisma-farm.reader';
import {
  LOT_REPOSITORY,
  FARM_READER,
  LotRepositoryPort,
  FarmReaderPort,
} from './application/lot.ports';
import { FindAllLotsUseCase } from './application/use-cases/find-all-lots.use-case';
import { FindLotUseCase } from './application/use-cases/find-lot.use-case';
import { CreateLotUseCase } from './application/use-cases/create-lot.use-case';
import { UpdateLotUseCase } from './application/use-cases/update-lot.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [LotController],
  providers: [
    LotService,
    PrismaLotRepository,
    PrismaFarmReader,
    {
      provide: LOT_REPOSITORY,
      useExisting: PrismaLotRepository,
    },
    {
      provide: FARM_READER,
      useExisting: PrismaFarmReader,
    },
    {
      provide: FindAllLotsUseCase,
      useFactory: (repository: LotRepositoryPort) =>
        new FindAllLotsUseCase(repository),
      inject: [LOT_REPOSITORY],
    },
    {
      provide: FindLotUseCase,
      useFactory: (repository: LotRepositoryPort) =>
        new FindLotUseCase(repository),
      inject: [LOT_REPOSITORY],
    },
    {
      provide: CreateLotUseCase,
      useFactory: (repository: LotRepositoryPort, farmReader: FarmReaderPort) =>
        new CreateLotUseCase(repository, farmReader),
      inject: [LOT_REPOSITORY, FARM_READER],
    },
    {
      provide: UpdateLotUseCase,
      useFactory: (repository: LotRepositoryPort, farmReader: FarmReaderPort) =>
        new UpdateLotUseCase(repository, farmReader),
      inject: [LOT_REPOSITORY, FARM_READER],
    },
  ],
  exports: [LotService],
})
export class LotModule {}
