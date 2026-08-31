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

  findAllByCompanyId(companyId: string): Promise<TaskTypeRecord[]> {
    return this.prisma.taskType.findMany({ where: { companyId } });
  }

  findByIdForCompany(id: string, companyId: string): Promise<TaskTypeRecord | null> {
    return this.prisma.taskType.findFirst({ where: { id, companyId } });
  }

  findByNameAndCompanyId(name: string, companyId: string): Promise<TaskTypeRecord | null> {
    return this.prisma.taskType.findFirst({ where: { name, companyId } });
  }

  findByIdsForCompany(ids: string[], companyId: string): Promise<TaskLookupRecord[]> {
    return this.prisma.task.findMany({
      where: { id: { in: ids }, taskType: { companyId } },
      select: { id: true },
    });
  }

  create(data: CreateTaskTypeData): Promise<TaskTypeRecord> {
    return this.prisma.taskType.create({ data });
  }

  async updateForCompany(
    id: string,
    companyId: string,
    data: UpdateTaskTypeData,
  ): Promise<TaskTypeRecord> {
    const taskType = await this.prisma.taskType.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!taskType) {
      throw new Error(`Task type with id ${id} not found for company ${companyId}`);
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

  async deleteForCompany(id: string, companyId: string): Promise<void> {
    const taskType = await this.prisma.taskType.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!taskType) {
      throw new Error(`Task type with id ${id} not found for company ${companyId}`);
    }

    await this.prisma.taskType.delete({ where: { id: taskType.id } });
  }
}
