import { Module } from '@nestjs/common';
import { LaborTypeController } from './labor-type.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  TASK_READER,
  LABOR_TYPE_REPOSITORY,
  TaskReaderPort,
  LaborTypeRepositoryPort,
} from './application/labor-type.ports';
import { CreateLaborTypeUseCase } from './application/use-cases/create-labor-type.use-case';
import { DeleteLaborTypeUseCase } from './application/use-cases/delete-labor-type.use-case';
import { FindAllLaborTypesUseCase } from './application/use-cases/find-all-labor-types.use-case';
import { FindLaborTypeUseCase } from './application/use-cases/find-labor-type.use-case';
import { UpdateLaborTypeUseCase } from './application/use-cases/update-labor-type.use-case';
import { PrismaTaskReader } from './adapters/outbound/prisma-task.reader';
import { PrismaLaborTypeRepository } from './adapters/outbound/prisma-labor-type.repository';
import { LaborTypeService } from './labor-type.service';

@Module({
  imports: [PrismaModule],
  controllers: [LaborTypeController],
  providers: [
    LaborTypeService,
    { provide: LABOR_TYPE_REPOSITORY, useClass: PrismaLaborTypeRepository },
    { provide: TASK_READER, useClass: PrismaTaskReader },
    {
      provide: FindAllLaborTypesUseCase,
      useFactory: (repository: LaborTypeRepositoryPort) => new FindAllLaborTypesUseCase(repository),
      inject: [LABOR_TYPE_REPOSITORY],
    },
    {
      provide: FindLaborTypeUseCase,
      useFactory: (repository: LaborTypeRepositoryPort) => new FindLaborTypeUseCase(repository),
      inject: [LABOR_TYPE_REPOSITORY],
    },
    {
      provide: CreateLaborTypeUseCase,
      useFactory: (repository: LaborTypeRepositoryPort) => new CreateLaborTypeUseCase(repository),
      inject: [LABOR_TYPE_REPOSITORY],
    },
    {
      provide: UpdateLaborTypeUseCase,
      useFactory: (repository: LaborTypeRepositoryPort, taskReader: TaskReaderPort) =>
        new UpdateLaborTypeUseCase(repository, taskReader),
      inject: [LABOR_TYPE_REPOSITORY, TASK_READER],
    },
    {
      provide: DeleteLaborTypeUseCase,
      useFactory: (repository: LaborTypeRepositoryPort) => new DeleteLaborTypeUseCase(repository),
      inject: [LABOR_TYPE_REPOSITORY],
    },
  ],
  exports: [LaborTypeService],
})
export class LaborTypeModule {}
