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

  findAllByCompanyId(tenantId: string): Promise<TaskTypeRecord[]> {
    return this.prisma.taskType.findMany({ where: { tenantId } });
  }

  findByIdForCompany(id: string, tenantId: string): Promise<TaskTypeRecord | null> {
    return this.prisma.taskType.findFirst({ where: { id, tenantId } });
  }

  findByNameAndCompanyId(name: string, tenantId: string): Promise<TaskTypeRecord | null> {
    return this.prisma.taskType.findFirst({ where: { name, tenantId } });
  }

  findByIdsForCompany(ids: string[], tenantId: string): Promise<TaskLookupRecord[]> {
    return this.prisma.task.findMany({
      where: { id: { in: ids }, taskType: { tenantId } },
      select: { id: true },
    });
  }

  create(data: CreateTaskTypeData): Promise<TaskTypeRecord> {
    return this.prisma.taskType.create({ data });
  }

  async updateForCompany(
    id: string,
    tenantId: string,
    data: UpdateTaskTypeData,
  ): Promise<TaskTypeRecord> {
    const taskType = await this.prisma.taskType.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!taskType) {
      throw new Error(`Task type with id ${id} not found for tenant ${tenantId}`);
    }

    return this.prisma.taskType.update({
      where: { id: taskType.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.taskIds !== undefined
          ? { tasks: { set: data.taskIds.map((taskId) => ({ id: taskId })) } }
          : {}),
      },
    });
  }

  async deleteForCompany(id: string, tenantId: string): Promise<void> {
    const taskType = await this.prisma.taskType.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!taskType) {
      throw new Error(`Task type with id ${id} not found for tenant ${tenantId}`);
    }

    await this.prisma.taskType.delete({ where: { id: taskType.id } });
  }
}
