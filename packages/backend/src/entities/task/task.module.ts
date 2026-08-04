import { forwardRef, Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { TASK_REPOSITORY, TASK_TYPE_LOOKUP } from './ports/task.repository';
import { PrismaTaskRepository } from './adapters/outbound/prisma/prisma-task.repository';
import { TASK_TYPE_REPOSITORY } from '../task-type/ports/task-type.repository';
import { TaskTypeModule } from '../task-type/task-type.module';
import { LotModule } from '../lot/lot.module';
import { UserModule } from '../user/user.module';

@Module({
  // T-F2-51 (D1): in-wave swap — el capability port TASK_TYPE_LOOKUP ya no se
  // implementa con un adapter local de prisma; se ALIASA a TASK_TYPE_REPOSITORY
  // exportado por TaskTypeModule (T-F2-50). Contract unchanged: el service y su
  // spec (T-F2-41) siguen inyectando TASK_TYPE_LOOKUP. El ciclo task ↔ task-type
  // se resuelve con forwardRef en ambos módulos.
  imports: [
    PrismaModule,
    LotModule,
    UserModule,
    forwardRef(() => TaskTypeModule),
  ],
  controllers: [TaskController],
  providers: [
    TaskService,
    {
      provide: TASK_REPOSITORY,
      useClass: PrismaTaskRepository,
    },
    {
      provide: TASK_TYPE_LOOKUP,
      useExisting: TASK_TYPE_REPOSITORY,
    },
  ],
  exports: [TaskService, TASK_REPOSITORY],
})
export class TaskModule {}
