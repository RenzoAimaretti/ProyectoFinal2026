import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  INPUT_REPOSITORY,
  InputRepositoryPort,
} from './application/input.ports';
import { CreateInputUseCase } from './application/use-cases/create-input.use-case';
import { FindAllInputsUseCase } from './application/use-cases/find-all-inputs.use-case';
import { FindInputUseCase } from './application/use-cases/find-input.use-case';
import { UpdateInputUseCase } from './application/use-cases/update-input.use-case';
import { PrismaInputRepository } from './adapters/outbound/prisma-input.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaInputRepository,
    { provide: INPUT_REPOSITORY, useExisting: PrismaInputRepository },
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
      useFactory: (repository: InputRepositoryPort) =>
        new CreateInputUseCase(repository),
      inject: [INPUT_REPOSITORY],
    },
    {
      provide: UpdateInputUseCase,
      useFactory: (repository: InputRepositoryPort) =>
        new UpdateInputUseCase(repository),
      inject: [INPUT_REPOSITORY],
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
