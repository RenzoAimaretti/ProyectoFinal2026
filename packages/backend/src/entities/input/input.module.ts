import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  INPUT_CATEGORY_READER,
  InputCategoryReaderPort,
  INPUT_REPOSITORY,
  INPUT_STOCK_READER,
  InputRepositoryPort,
  InputStockReaderPort,
} from './application/input.ports';
import { CreateInputUseCase } from './application/use-cases/create-input.use-case';
import { FindAllInputsUseCase } from './application/use-cases/find-all-inputs.use-case';
import { FindInputUseCase } from './application/use-cases/find-input.use-case';
import { UpdateInputUseCase } from './application/use-cases/update-input.use-case';
import { InputController } from './adapters/inbound/input.controller';
import { PrismaInputRepository } from './adapters/outbound/prisma-input.repository';
import { PrismaInputStockReader } from './adapters/outbound/prisma-input-stock.reader';
import { PrismaInputCategoryReader } from './adapters/outbound/prisma-input-category.reader';

@Module({
  imports: [PrismaModule],
  controllers: [InputController],
  providers: [
    PrismaInputRepository,
    { provide: INPUT_REPOSITORY, useExisting: PrismaInputRepository },
    PrismaInputStockReader,
    PrismaInputCategoryReader,
    { provide: INPUT_CATEGORY_READER, useExisting: PrismaInputCategoryReader },
    { provide: INPUT_STOCK_READER, useExisting: PrismaInputStockReader },
    {
      provide: FindAllInputsUseCase,
      useFactory: (repository: InputRepositoryPort) =>
        new FindAllInputsUseCase(repository),
      inject: [INPUT_REPOSITORY],
    },
    {
      provide: FindInputUseCase,
      useFactory: (repository: InputRepositoryPort) =>
        new FindInputUseCase(repository),
      inject: [INPUT_REPOSITORY],
    },
    {
      provide: CreateInputUseCase,
      useFactory: (repository: InputRepositoryPort, categories: InputCategoryReaderPort) =>
        new CreateInputUseCase(repository, categories),
      inject: [INPUT_REPOSITORY, INPUT_CATEGORY_READER],
    },
    {
      provide: UpdateInputUseCase,
      useFactory: (
        repository: InputRepositoryPort,
        stockReader: InputStockReaderPort,
        categories: InputCategoryReaderPort,
      ) => new UpdateInputUseCase(repository, stockReader, categories),
      inject: [INPUT_REPOSITORY, INPUT_STOCK_READER, INPUT_CATEGORY_READER],
    },
  ],
  exports: [
    FindAllInputsUseCase,
    FindInputUseCase,
    CreateInputUseCase,
    UpdateInputUseCase,
  ],
})
export class InputModule {}
