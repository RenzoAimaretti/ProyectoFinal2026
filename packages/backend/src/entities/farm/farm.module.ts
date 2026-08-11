import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  COMPANY_READER,
  FARM_REPOSITORY,
  CompanyReaderPort,
  FarmRepositoryPort,
} from './application/farm.ports';
import { CreateFarmUseCase } from './application/use-cases/create-farm.use-case';
import { FindAllFarmsUseCase } from './application/use-cases/find-all-farms.use-case';
import { FindFarmUseCase } from './application/use-cases/find-farm.use-case';
import { UpdateFarmUseCase } from './application/use-cases/update-farm.use-case';
import { PrismaFarmRepository } from './adapters/outbound/prisma-farm.repository';
import { FarmController } from './farm.controller';
import { FarmService } from './farm.service';

@Module({
  imports: [PrismaModule],
  controllers: [FarmController],
  providers: [
    FarmService,
    PrismaFarmRepository,
    { provide: FARM_REPOSITORY, useExisting: PrismaFarmRepository },
    { provide: COMPANY_READER, useExisting: PrismaFarmRepository },
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
        companyReader: CompanyReaderPort,
      ) => new CreateFarmUseCase(repository, companyReader),
      inject: [FARM_REPOSITORY, COMPANY_READER],
    },
    {
      provide: UpdateFarmUseCase,
      useFactory: (
        repository: FarmRepositoryPort,
        companyReader: CompanyReaderPort,
      ) => new UpdateFarmUseCase(repository, companyReader),
      inject: [FARM_REPOSITORY, COMPANY_READER],
    },
  ],
  exports: [FarmService],
})
export class FarmModule {}
