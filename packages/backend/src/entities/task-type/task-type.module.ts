import { forwardRef, Module } from '@nestjs/common';
import { TaskTypeService } from './task-type.service';
import { TaskTypeController } from './task-type.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { TASK_TYPE_REPOSITORY } from './ports/task-type.repository';
import { PrismaTaskTypeRepository } from './adapters/outbound/prisma/prisma-task-type.repository';
import { TaskModule } from '../task/task.module';

@Module({
  // T-F2-50/51 (D1): ciclo task ↔ task-type resuelto con forwardRef en AMBOS
  // lados. TaskTypeModule necesita TASK_REPOSITORY (exportado por TaskModule,
  // T-F2-45) para el cross-read de taskIds; TaskModule necesita
  // TASK_TYPE_REPOSITORY (este módulo) para el create de task (T-F2-51 swap).
  imports: [PrismaModule, forwardRef(() => TaskModule)],
  controllers: [TaskTypeController],
  providers: [
    TaskTypeService,
    {
      provide: TASK_TYPE_REPOSITORY,
      useClass: PrismaTaskTypeRepository,
    },
  ],
  exports: [TaskTypeService, TASK_TYPE_REPOSITORY],
})
export class TaskTypeModule {}
