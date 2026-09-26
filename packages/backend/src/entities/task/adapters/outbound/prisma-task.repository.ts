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

  findAllByTenantId(tenantId: string): Promise<TaskOutput[]> {
    return this.prisma.task.findMany({
      where: { lot: { farm: { client: { tenantId } } } },
    });
  }

  findByIdForTenant(id: string, tenantId: string): Promise<TaskOutput | null> {
    return this.prisma.task.findFirst({
      where: { id, lot: { farm: { client: { tenantId } } } },
    });
  }

  findByIdWithOperatorsForTenant(
    id: string,
    tenantId: string,
  ): Promise<TaskWithOperatorsRecord | null> {
    return this.prisma.task.findFirst({
      where: { id, lot: { farm: { client: { tenantId } } } },
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

  async updateForTenant(id: string, tenantId: string, data: UpdateTaskData): Promise<TaskOutput> {
    const task = await this.prisma.task.findFirst({
      where: { id, lot: { farm: { client: { tenantId } } } },
      select: { id: true },
    });

    if (!task) {
      throw new Error(`Task with id ${id} not found for tenant ${tenantId}`);
    }

    return this.prisma.task.update({
      where: { id: task.id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.startedAt !== undefined ? { startedAt: data.startedAt } : {}),
        ...(data.finishedAt !== undefined ? { finishedAt: data.finishedAt } : {}),
      },
    });
  }

  async addOperatorForTenant(taskId: string, tenantId: string, operatorId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, lot: { farm: { client: { tenantId } } } },
      select: { id: true },
    });

    if (!task) {
      throw new Error(`Task with id ${taskId} not found for tenant ${tenantId}`);
    }

    await this.prisma.task.update({
      where: { id: task.id },
      data: { operators: { connect: { id: operatorId } } },
    });
  }

  async removeOperatorForTenant(
    taskId: string,
    tenantId: string,
    operatorId: string,
  ): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, lot: { farm: { client: { tenantId } } } },
      select: { id: true },
    });

    if (!task) {
      throw new Error(`Task with id ${taskId} not found for tenant ${tenantId}`);
    }

    await this.prisma.task.update({
      where: { id: task.id },
      data: { operators: { disconnect: { id: operatorId } } },
    });
  }

  async deleteForTenant(id: string, tenantId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id, lot: { farm: { client: { tenantId } } } },
      select: { id: true },
    });

    if (!task) {
      throw new Error(`Task with id ${id} not found for tenant ${tenantId}`);
    }

    await this.prisma.task.delete({ where: { id: task.id } });
  }
}
