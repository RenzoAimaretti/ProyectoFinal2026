import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  LOT_READER,
  TASK_REPOSITORY,
  TASK_TYPE_READER,
  USER_READER,
  LotReaderPort,
  TaskRepositoryPort,
  TaskTypeReaderPort,
  UserReaderPort,
} from './application/task.ports';
import { AddTaskOperatorUseCase } from './application/use-cases/add-task-operator.use-case';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { DeleteTaskUseCase } from './application/use-cases/delete-task.use-case';
import { FindAllTasksUseCase } from './application/use-cases/find-all-tasks.use-case';
import { FindTaskUseCase } from './application/use-cases/find-task.use-case';
import { RemoveTaskOperatorUseCase } from './application/use-cases/remove-task-operator.use-case';
import { UpdateTaskUseCase } from './application/use-cases/update-task.use-case';
import { PrismaLotReader } from './adapters/outbound/prisma-lot.reader';
import { PrismaTaskRepository } from './adapters/outbound/prisma-task.repository';
import { PrismaTaskTypeReader } from './adapters/outbound/prisma-task-type.reader';
import { PrismaUserReader } from './adapters/outbound/prisma-user.reader';
import { TaskService } from './task.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaskController],
  providers: [
    TaskService,
    { provide: TASK_REPOSITORY, useClass: PrismaTaskRepository },
    { provide: LOT_READER, useClass: PrismaLotReader },
    { provide: TASK_TYPE_READER, useClass: PrismaTaskTypeReader },
    { provide: USER_READER, useClass: PrismaUserReader },
    {
      provide: FindAllTasksUseCase,
      useFactory: (repository: TaskRepositoryPort) => new FindAllTasksUseCase(repository),
      inject: [TASK_REPOSITORY],
    },
    {
      provide: FindTaskUseCase,
      useFactory: (repository: TaskRepositoryPort) => new FindTaskUseCase(repository),
      inject: [TASK_REPOSITORY],
    },
    {
      provide: CreateTaskUseCase,
      useFactory: (
        repository: TaskRepositoryPort,
        lotReader: LotReaderPort,
        taskTypeReader: TaskTypeReaderPort,
      ) => new CreateTaskUseCase(repository, lotReader, taskTypeReader),
      inject: [TASK_REPOSITORY, LOT_READER, TASK_TYPE_READER],
    },
    {
      provide: UpdateTaskUseCase,
      useFactory: (repository: TaskRepositoryPort) => new UpdateTaskUseCase(repository),
      inject: [TASK_REPOSITORY],
    },
    {
      provide: AddTaskOperatorUseCase,
      useFactory: (repository: TaskRepositoryPort, userReader: UserReaderPort) =>
        new AddTaskOperatorUseCase(repository, userReader),
      inject: [TASK_REPOSITORY, USER_READER],
    },
    {
      provide: RemoveTaskOperatorUseCase,
      useFactory: (repository: TaskRepositoryPort) => new RemoveTaskOperatorUseCase(repository),
      inject: [TASK_REPOSITORY],
    },
    {
      provide: DeleteTaskUseCase,
      useFactory: (repository: TaskRepositoryPort) => new DeleteTaskUseCase(repository),
      inject: [TASK_REPOSITORY],
    },
  ],
  exports: [TaskService],
})
export class TaskModule {}
