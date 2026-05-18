import { Module } from '@nestjs/common';
import { TaskTypeService } from './task-type.service';
import { TaskTypeController } from './task-type.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TaskTypeController],
  providers: [TaskTypeService],
  exports: [TaskTypeService],
})
export class TaskTypeModule {}
