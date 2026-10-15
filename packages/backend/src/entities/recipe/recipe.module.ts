import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  LOT_READER,
  RECIPE_INPUT_READER,
  RECIPE_REPOSITORY,
  TASK_PRESCRIPTION,
  LotReaderPort,
  RecipeInputReaderPort,
  RecipeRepositoryPort,
  TaskPrescriptionPort,
} from './application/recipe.ports';
import { CreatePrescriptionUseCase } from './application/use-cases/create-prescription.use-case';
import { CreateRecipeUseCase } from './application/use-cases/create-recipe.use-case';
import { FindRecipeUseCase } from './application/use-cases/find-recipe.use-case';
import { FindRecipesByLotUseCase } from './application/use-cases/find-recipes-by-lot.use-case';
import { UpdateRecipeUseCase } from './application/use-cases/update-recipe.use-case';
import { RecipeController } from './adapters/inbound/recipe.controller';
import { PrismaLotReader } from './adapters/outbound/prisma-lot.reader';
import { PrismaRecipeInputReader } from './adapters/outbound/prisma-recipe-input.reader';
import { PrismaRecipeRepository } from './adapters/outbound/prisma-recipe.repository';
import { PrismaTaskPrescriptionAdapter } from './adapters/outbound/prisma-task-prescription.adapter';

@Module({
  imports: [PrismaModule],
  controllers: [RecipeController],
  providers: [
    PrismaRecipeRepository,
    PrismaLotReader,
    PrismaRecipeInputReader,
    PrismaTaskPrescriptionAdapter,
    { provide: RECIPE_REPOSITORY, useExisting: PrismaRecipeRepository },
    { provide: LOT_READER, useExisting: PrismaLotReader },
    { provide: RECIPE_INPUT_READER, useExisting: PrismaRecipeInputReader },
    {
      provide: TASK_PRESCRIPTION,
      useExisting: PrismaTaskPrescriptionAdapter,
    },
    {
      provide: FindRecipesByLotUseCase,
      useFactory: (repository: RecipeRepositoryPort) =>
        new FindRecipesByLotUseCase(repository),
      inject: [RECIPE_REPOSITORY],
    },
    {
      provide: FindRecipeUseCase,
      useFactory: (repository: RecipeRepositoryPort) =>
        new FindRecipeUseCase(repository),
      inject: [RECIPE_REPOSITORY],
    },
    {
      provide: CreateRecipeUseCase,
      useFactory: (
        repository: RecipeRepositoryPort,
        lotReader: LotReaderPort,
        inputReader: RecipeInputReaderPort,
      ) => new CreateRecipeUseCase(repository, lotReader, inputReader),
      inject: [RECIPE_REPOSITORY, LOT_READER, RECIPE_INPUT_READER],
    },
    {
      provide: CreatePrescriptionUseCase,
      useFactory: (
        repository: RecipeRepositoryPort,
        taskPrescription: TaskPrescriptionPort,
        inputReader: RecipeInputReaderPort,
      ) =>
        new CreatePrescriptionUseCase(
          repository,
          taskPrescription,
          inputReader,
        ),
      inject: [RECIPE_REPOSITORY, TASK_PRESCRIPTION, RECIPE_INPUT_READER],
    },
    {
      provide: UpdateRecipeUseCase,
      useFactory: (
        repository: RecipeRepositoryPort,
        taskPrescription: TaskPrescriptionPort,
        inputReader: RecipeInputReaderPort,
      ) => new UpdateRecipeUseCase(repository, taskPrescription, inputReader),
      inject: [RECIPE_REPOSITORY, TASK_PRESCRIPTION, RECIPE_INPUT_READER],
    },
  ],
  exports: [
    FindRecipesByLotUseCase,
    FindRecipeUseCase,
    CreateRecipeUseCase,
    CreatePrescriptionUseCase,
    UpdateRecipeUseCase,
  ],
})
export class RecipeModule {}
