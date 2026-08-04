import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  CreateTaskTypeData,
  TaskTypeEntity,
  TaskTypeRepositoryPort,
  UpdateTaskTypeData,
} from '../../../ports/task-type.repository';

interface TaskTypeRow {
  id: string;
  name: string;
  description: string | null;
}

@Injectable()
export class PrismaTaskTypeRepository implements TaskTypeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<TaskTypeEntity[]> {
    const rows = await this.prisma.taskType.findMany();
    return rows.map((row) => this.toEntity(row));
  }

  async findById(id: string): Promise<TaskTypeEntity | null> {
    const row = await this.prisma.taskType.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByName(name: string): Promise<TaskTypeEntity | null> {
    const row = await this.prisma.taskType.findFirst({ where: { name } });
    return row ? this.toEntity(row) : null;
  }

  async create(data: CreateTaskTypeData): Promise<TaskTypeEntity> {
    const row = await this.prisma.taskType.create({
      data: {
        name: data.name,
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
      },
    });
    return this.toEntity(row);
  }

  async update(id: string, data: UpdateTaskTypeData): Promise<TaskTypeEntity> {
    const row = await this.prisma.taskType.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.taskIds !== undefined
          ? { tasks: { set: data.taskIds.map((taskId) => ({ id: taskId })) } }
          : {}),
      },
    });
    return this.toEntity(row);
  }

  async delete(id: string): Promise<TaskTypeEntity> {
    const row = await this.prisma.taskType.delete({ where: { id } });
    return this.toEntity(row);
  }

  private toEntity(row: TaskTypeRow): TaskTypeEntity {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
    };
  }
}
