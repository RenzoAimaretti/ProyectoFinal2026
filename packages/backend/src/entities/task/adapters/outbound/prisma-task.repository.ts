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

  findAllByCompanyId(companyId: string): Promise<TaskOutput[]> {
    return this.prisma.task.findMany({
      where: { lot: { farm: { companyId } } },
    });
  }

  findByIdForCompany(id: string, companyId: string): Promise<TaskOutput | null> {
    return this.prisma.task.findFirst({
      where: { id, lot: { farm: { companyId } } },
    });
  }

  findByIdWithOperatorsForCompany(
    id: string,
    companyId: string,
  ): Promise<TaskWithOperatorsRecord | null> {
    return this.prisma.task.findFirst({
      where: { id, lot: { farm: { companyId } } },
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

  async updateForCompany(id: string, companyId: string, data: UpdateTaskData): Promise<TaskOutput> {
    const task = await this.prisma.task.findFirst({
      where: { id, lot: { farm: { companyId } } },
      select: { id: true },
    });

    if (!task) {
      throw new Error(`Task with id ${id} not found for company ${companyId}`);
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

  async addOperatorForCompany(taskId: string, companyId: string, operatorId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, lot: { farm: { companyId } } },
      select: { id: true },
    });

    if (!task) {
      throw new Error(`Task with id ${taskId} not found for company ${companyId}`);
    }

    await this.prisma.task.update({
      where: { id: task.id },
      data: { operators: { connect: { id: operatorId } } },
    });
  }

  async removeOperatorForCompany(
    taskId: string,
    companyId: string,
    operatorId: string,
  ): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, lot: { farm: { companyId } } },
      select: { id: true },
    });

    if (!task) {
      throw new Error(`Task with id ${taskId} not found for company ${companyId}`);
    }

    await this.prisma.task.update({
      where: { id: task.id },
      data: { operators: { disconnect: { id: operatorId } } },
    });
  }

  async deleteForCompany(id: string, companyId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id, lot: { farm: { companyId } } },
      select: { id: true },
    });

    if (!task) {
      throw new Error(`Task with id ${id} not found for company ${companyId}`);
    }

    await this.prisma.task.delete({ where: { id: task.id } });
  }
}
