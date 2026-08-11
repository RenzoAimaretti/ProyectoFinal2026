import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  LIVESTOCK_READER,
  USER_READER,
  WEIGHT_RECORD_REPOSITORY,
  LivestockReaderPort,
  UserReaderPort,
  WeightRecordRepositoryPort,
} from './application/weight-record.ports';
import { CreateWeightRecordUseCase } from './application/use-cases/create-weight-record.use-case';
import { DeleteWeightRecordUseCase } from './application/use-cases/delete-weight-record.use-case';
import { FindAllWeightRecordsUseCase } from './application/use-cases/find-all-weight-records.use-case';
import { FindWeightRecordUseCase } from './application/use-cases/find-weight-record.use-case';
import { UpdateWeightRecordUseCase } from './application/use-cases/update-weight-record.use-case';
import { PrismaLivestockReader } from './adapters/outbound/prisma-livestock.reader';
import { PrismaUserReader } from './adapters/outbound/prisma-user.reader';
import { PrismaWeightRecordRepository } from './adapters/outbound/prisma-weight-record.repository';
import { WeightRecordController } from './weight-record.controller';
import { WeightRecordService } from './weight-record.service';

@Module({
  imports: [PrismaModule],
  controllers: [WeightRecordController],
  providers: [
    WeightRecordService,
    { provide: WEIGHT_RECORD_REPOSITORY, useClass: PrismaWeightRecordRepository },
    { provide: LIVESTOCK_READER, useClass: PrismaLivestockReader },
    { provide: USER_READER, useClass: PrismaUserReader },
    {
      provide: FindAllWeightRecordsUseCase,
      useFactory: (repository: WeightRecordRepositoryPort) =>
        new FindAllWeightRecordsUseCase(repository),
      inject: [WEIGHT_RECORD_REPOSITORY],
    },
    {
      provide: FindWeightRecordUseCase,
      useFactory: (repository: WeightRecordRepositoryPort) =>
        new FindWeightRecordUseCase(repository),
      inject: [WEIGHT_RECORD_REPOSITORY],
    },
    {
      provide: CreateWeightRecordUseCase,
      useFactory: (
        repository: WeightRecordRepositoryPort,
        livestockReader: LivestockReaderPort,
        userReader: UserReaderPort,
      ) => new CreateWeightRecordUseCase(repository, livestockReader, userReader),
      inject: [WEIGHT_RECORD_REPOSITORY, LIVESTOCK_READER, USER_READER],
    },
    {
      provide: UpdateWeightRecordUseCase,
      useFactory: (repository: WeightRecordRepositoryPort, userReader: UserReaderPort) =>
        new UpdateWeightRecordUseCase(repository, userReader),
      inject: [WEIGHT_RECORD_REPOSITORY, USER_READER],
    },
    {
      provide: DeleteWeightRecordUseCase,
      useFactory: (repository: WeightRecordRepositoryPort) =>
        new DeleteWeightRecordUseCase(repository),
      inject: [WEIGHT_RECORD_REPOSITORY],
    },
  ],
  exports: [WeightRecordService],
})
export class WeightRecordModule {}
