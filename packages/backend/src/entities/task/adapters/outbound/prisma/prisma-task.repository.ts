import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { TaskStatus as PrismaTaskStatus } from '../../../../../../prisma/generated/enums';
import {
  CreateTaskData,
  TaskEntity,
  TaskRepositoryPort,
  TaskWithOperatorsEntity,
  UpdateTaskData,
} from '../../../ports/task.repository';
import { TaskStatus } from '../../../domain/task-status';

// Único lugar del módulo que mapea el enum generado ↔ el de dominio (REQ-A-04).
const PRISMA_TASK_STATUS_TO_DOMAIN: Record<PrismaTaskStatus, TaskStatus> = {
  PENDIENTE: TaskStatus.PENDIENTE,
  EN_PROGRESO: TaskStatus.EN_PROGRESO,
  FINALIZADA: TaskStatus.FINALIZADA,
  CANCELADA: TaskStatus.CANCELADA,
};

const DOMAIN_TASK_STATUS_TO_PRISMA: Record<TaskStatus, PrismaTaskStatus> = {
  [TaskStatus.PENDIENTE]: 'PENDIENTE',
  [TaskStatus.EN_PROGRESO]: 'EN_PROGRESO',
  [TaskStatus.FINALIZADA]: 'FINALIZADA',
  [TaskStatus.CANCELADA]: 'CANCELADA',
};

interface TaskRow {
  id: string;
  lotId: string;
  taskTypeId: string;
  status: PrismaTaskStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  updatedTaskAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deleted: boolean;
}

@Injectable()
export class PrismaTaskRepository implements TaskRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<TaskEntity[]> {
    const rows = await this.prisma.task.findMany();
    return rows.map((row) => this.toEntity(row));
  }

  async findById(id: string): Promise<TaskEntity | null> {
    const row = await this.prisma.task.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByIds(ids: string[]): Promise<TaskEntity[]> {
    const rows = await this.prisma.task.findMany({
      where: { id: { in: ids } },
    });
    return rows.map((row) => this.toEntity(row));
  }

  async findByIdWithOperators(
    id: string,
  ): Promise<TaskWithOperatorsEntity | null> {
    const row = await this.prisma.task.findUnique({
      where: { id },
      include: { operators: { select: { id: true } } },
    });
    if (!row) return null;
    return {
      ...this.toEntity(row),
      operators: row.operators ?? [],
    };
  }

  async create(data: CreateTaskData): Promise<TaskEntity> {
    const row = await this.prisma.task.create({
      data: {
        lotId: data.lotId,
        taskTypeId: data.taskTypeId,
        startedAt: data.startedAt,
      },
    });
    return this.toEntity(row);
  }

  async update(id: string, data: UpdateTaskData): Promise<TaskEntity> {
    const row = await this.prisma.task.update({
      where: { id },
      data: {
        ...(data.status !== undefined
          ? { status: DOMAIN_TASK_STATUS_TO_PRISMA[data.status] }
          : {}),
        ...(data.startedAt !== undefined ? { startedAt: data.startedAt } : {}),
        ...(data.finishedAt !== undefined
          ? { finishedAt: data.finishedAt }
          : {}),
      },
    });
    return this.toEntity(row);
  }

  async addOperator(taskId: string, operatorId: string): Promise<void> {
    await this.prisma.task.update({
      where: { id: taskId },
      data: { operators: { connect: { id: operatorId } } },
    });
  }

  async removeOperator(taskId: string, operatorId: string): Promise<void> {
    await this.prisma.task.update({
      where: { id: taskId },
      data: { operators: { disconnect: { id: operatorId } } },
    });
  }

  async delete(id: string): Promise<TaskEntity> {
    const row = await this.prisma.task.delete({ where: { id } });
    return this.toEntity(row);
  }

  private toEntity(row: TaskRow): TaskEntity {
    return {
      id: row.id,
      lotId: row.lotId,
      taskTypeId: row.taskTypeId,
      status: PRISMA_TASK_STATUS_TO_DOMAIN[row.status],
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      updatedTaskAt: row.updatedTaskAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
      deleted: row.deleted,
    };
  }
}
