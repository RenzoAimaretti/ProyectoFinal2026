import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreateTaskData,
  TaskOutput,
  TaskWithOperatorsRecord,
  UpdateTaskData,
} from '../../application/task.types';
import { TaskRepositoryPort } from '../../application/task.ports';

@Injectable()
export class PrismaTaskRepository implements TaskRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<TaskOutput[]> {
    return this.prisma.task.findMany();
  }

  findById(id: string): Promise<TaskOutput | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }

  findByIdWithOperators(id: string): Promise<TaskWithOperatorsRecord | null> {
    return this.prisma.task.findUnique({
      where: { id },
      include: { operators: { select: { id: true } } },
    });
  }

  create(data: CreateTaskData): Promise<TaskOutput> {
    return this.prisma.task.create({
      data: {
        lotId: data.lotId,
        taskTypeId: data.taskTypeId,
        startedAt: data.startedAt,
      },
    });
  }

  update(id: string, data: UpdateTaskData): Promise<TaskOutput> {
    return this.prisma.task.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.startedAt !== undefined ? { startedAt: data.startedAt } : {}),
        ...(data.finishedAt !== undefined ? { finishedAt: data.finishedAt } : {}),
      },
    });
  }

  addOperator(taskId: string, operatorId: string): Promise<void> {
    return this.prisma.task
      .update({
        where: { id: taskId },
        data: { operators: { connect: { id: operatorId } } },
      })
      .then(() => undefined);
  }

  removeOperator(taskId: string, operatorId: string): Promise<void> {
    return this.prisma.task
      .update({
        where: { id: taskId },
        data: { operators: { disconnect: { id: operatorId } } },
      })
      .then(() => undefined);
  }

  delete(id: string): Promise<void> {
    return this.prisma.task.delete({ where: { id } }).then(() => undefined);
  }
}
