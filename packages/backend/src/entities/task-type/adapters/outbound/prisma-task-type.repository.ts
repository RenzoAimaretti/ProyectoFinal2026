import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreateTaskTypeData,
  TaskLookupRecord,
  TaskTypeRecord,
  UpdateTaskTypeData,
} from '../../application/task-type.types';
import { TaskTypeRepositoryPort } from '../../application/task-type.ports';

@Injectable()
export class PrismaTaskTypeRepository implements TaskTypeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<TaskTypeRecord[]> {
    return this.prisma.taskType.findMany();
  }

  findById(id: string): Promise<TaskTypeRecord | null> {
    return this.prisma.taskType.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<TaskTypeRecord | null> {
    return this.prisma.taskType.findFirst({ where: { name } });
  }

  findByIds(ids: string[]): Promise<TaskLookupRecord[]> {
    return this.prisma.task.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
  }

  create(data: CreateTaskTypeData): Promise<TaskTypeRecord> {
    return this.prisma.taskType.create({ data });
  }

  update(id: string, data: UpdateTaskTypeData): Promise<TaskTypeRecord> {
    return this.prisma.taskType.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.taskIds !== undefined
          ? { tasks: { set: data.taskIds.map((taskId) => ({ id: taskId })) } }
          : {}),
      },
    });
  }

  delete(id: string): Promise<void> {
    return this.prisma.taskType.delete({ where: { id } }).then(() => undefined);
  }
}
