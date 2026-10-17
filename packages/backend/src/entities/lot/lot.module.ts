import { Module } from '@nestjs/common';
import { LotService } from './lot.service';
import { LotController } from './lot.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClientModule } from '../client/client.module';
import { PrismaLotRepository } from './adapters/outbound/prisma-lot.repository';
import { PrismaFarmReader } from './adapters/outbound/prisma-farm.reader';
import { PrismaLotHistoryReader } from './adapters/outbound/prisma-lot-history.reader';
import {
  LOT_REPOSITORY,
  FARM_READER,
  LOT_HISTORY_READER,
  LotRepositoryPort,
  FarmReaderPort,
  LotHistoryReaderPort,
} from './application/lot.ports';
import { DeriveLotStatesUseCase } from './application/use-cases/derive-lot-states.use-case';
import { FindAllLotsUseCase } from './application/use-cases/find-all-lots.use-case';
import { FindLotUseCase } from './application/use-cases/find-lot.use-case';
import { CreateLotUseCase } from './application/use-cases/create-lot.use-case';
import { UpdateLotUseCase } from './application/use-cases/update-lot.use-case';
import { DeleteLotUseCase } from './application/use-cases/delete-lot.use-case';

@Module({
  imports: [PrismaModule, ClientModule],
  controllers: [LotController],
  providers: [
    LotService,
    JwtAuthGuard,
    PrismaLotRepository,
    PrismaFarmReader,
    PrismaLotHistoryReader,
    {
      provide: LOT_REPOSITORY,
      useExisting: PrismaLotRepository,
    },
    {
      provide: FARM_READER,
      useExisting: PrismaFarmReader,
    },
    {
      provide: LOT_HISTORY_READER,
      useExisting: PrismaLotHistoryReader,
    },
    {
      provide: DeriveLotStatesUseCase,
      useFactory: (historyReader: LotHistoryReaderPort) =>
        new DeriveLotStatesUseCase(historyReader),
      inject: [LOT_HISTORY_READER],
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
      provide: DeleteLotUseCase,
      useFactory: (repository: LotRepositoryPort) => new DeleteLotUseCase(repository),
      inject: [LOT_REPOSITORY],
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
