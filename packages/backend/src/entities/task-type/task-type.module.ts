import { Module } from '@nestjs/common';
import { TaskTypeController } from './task-type.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  TASK_READER,
  TASK_TYPE_REPOSITORY,
  TaskReaderPort,
  TaskTypeRepositoryPort,
} from './application/task-type.ports';
import { CreateTaskTypeUseCase } from './application/use-cases/create-task-type.use-case';
import { DeleteTaskTypeUseCase } from './application/use-cases/delete-task-type.use-case';
import { FindAllTaskTypesUseCase } from './application/use-cases/find-all-task-types.use-case';
import { FindTaskTypeUseCase } from './application/use-cases/find-task-type.use-case';
import { UpdateTaskTypeUseCase } from './application/use-cases/update-task-type.use-case';
import { PrismaTaskReader } from './adapters/outbound/prisma-task.reader';
import { PrismaTaskTypeRepository } from './adapters/outbound/prisma-task-type.repository';
import { TaskTypeService } from './task-type.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaskTypeController],
  providers: [
    TaskTypeService,
    { provide: TASK_TYPE_REPOSITORY, useClass: PrismaTaskTypeRepository },
    { provide: TASK_READER, useClass: PrismaTaskReader },
    {
      provide: FindAllTaskTypesUseCase,
      useFactory: (repository: TaskTypeRepositoryPort) => new FindAllTaskTypesUseCase(repository),
      inject: [TASK_TYPE_REPOSITORY],
    },
    {
      provide: FindTaskTypeUseCase,
      useFactory: (repository: TaskTypeRepositoryPort) => new FindTaskTypeUseCase(repository),
      inject: [TASK_TYPE_REPOSITORY],
    },
    {
      provide: CreateTaskTypeUseCase,
      useFactory: (repository: TaskTypeRepositoryPort) => new CreateTaskTypeUseCase(repository),
      inject: [TASK_TYPE_REPOSITORY],
    },
    {
      provide: UpdateTaskTypeUseCase,
      useFactory: (repository: TaskTypeRepositoryPort, taskReader: TaskReaderPort) =>
        new UpdateTaskTypeUseCase(repository, taskReader),
      inject: [TASK_TYPE_REPOSITORY, TASK_READER],
    },
    {
      provide: DeleteTaskTypeUseCase,
      useFactory: (repository: TaskTypeRepositoryPort) => new DeleteTaskTypeUseCase(repository),
      inject: [TASK_TYPE_REPOSITORY],
    },
  ],
  exports: [TaskTypeService],
})
export class TaskTypeModule {}
