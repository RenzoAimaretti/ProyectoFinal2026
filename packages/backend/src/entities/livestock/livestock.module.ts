import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  COMPANY_READER,
  LIVESTOCK_REPOSITORY,
  LOT_READER,
  CompanyReaderPort,
  LivestockRepositoryPort,
  LotReaderPort,
} from './application/livestock.ports';
import { CreateLivestockUseCase } from './application/use-cases/create-livestock.use-case';
import { FindAllLivestockUseCase } from './application/use-cases/find-all-livestock.use-case';
import { FindLivestockUseCase } from './application/use-cases/find-livestock.use-case';
import { RemoveLivestockUseCase } from './application/use-cases/remove-livestock.use-case';
import { UpdateLivestockUseCase } from './application/use-cases/update-livestock.use-case';
import { PrismaCompanyReader } from './adapters/outbound/prisma-company.reader';
import { PrismaLivestockRepository } from './adapters/outbound/prisma-livestock.repository';
import { PrismaLotReader } from './adapters/outbound/prisma-lot.reader';
import { LivestockController } from './livestock.controller';
import { LivestockService } from './livestock.service';

@Module({
  imports: [PrismaModule],
  controllers: [LivestockController],
  providers: [
    LivestockService,
    { provide: LIVESTOCK_REPOSITORY, useClass: PrismaLivestockRepository },
    { provide: COMPANY_READER, useClass: PrismaCompanyReader },
    { provide: LOT_READER, useClass: PrismaLotReader },
    {
      provide: FindAllLivestockUseCase,
      useFactory: (repository: LivestockRepositoryPort) =>
        new FindAllLivestockUseCase(repository),
      inject: [LIVESTOCK_REPOSITORY],
    },
    {
      provide: FindLivestockUseCase,
      useFactory: (repository: LivestockRepositoryPort) =>
        new FindLivestockUseCase(repository),
      inject: [LIVESTOCK_REPOSITORY],
    },
    {
      provide: CreateLivestockUseCase,
      useFactory: (
        repository: LivestockRepositoryPort,
        companyReader: CompanyReaderPort,
        lotReader: LotReaderPort,
      ) => new CreateLivestockUseCase(repository, companyReader, lotReader),
      inject: [LIVESTOCK_REPOSITORY, COMPANY_READER, LOT_READER],
    },
    {
      provide: UpdateLivestockUseCase,
      useFactory: (
        repository: LivestockRepositoryPort,
        companyReader: CompanyReaderPort,
        lotReader: LotReaderPort,
      ) => new UpdateLivestockUseCase(repository, companyReader, lotReader),
      inject: [LIVESTOCK_REPOSITORY, COMPANY_READER, LOT_READER],
    },
    {
      provide: RemoveLivestockUseCase,
      useFactory: (repository: LivestockRepositoryPort) =>
        new RemoveLivestockUseCase(repository),
      inject: [LIVESTOCK_REPOSITORY],
    },
  ],
  exports: [LivestockService],
})
export class LivestockModule {}
