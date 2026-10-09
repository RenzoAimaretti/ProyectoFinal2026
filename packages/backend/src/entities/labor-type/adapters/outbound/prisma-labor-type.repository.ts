import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreateLaborTypeData,
  TaskLookupRecord,
  LaborTypeRecord,
  UpdateLaborTypeData,
} from '../../application/labor-type.types';
import { LaborTypeRepositoryPort } from '../../application/labor-type.ports';

@Injectable()
export class PrismaLaborTypeRepository implements LaborTypeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTenantId(tenantId: string): Promise<LaborTypeRecord[]> {
    return this.prisma.laborType.findMany({ where: { tenantId } });
  }

  findByIdForTenant(id: string, tenantId: string): Promise<LaborTypeRecord | null> {
    return this.prisma.laborType.findFirst({ where: { id, tenantId } });
  }

  findByNameAndTenantId(name: string, tenantId: string): Promise<LaborTypeRecord | null> {
    return this.prisma.laborType.findFirst({ where: { name, tenantId } });
  }

  findByIdsForTenant(ids: string[], tenantId: string): Promise<TaskLookupRecord[]> {
    return this.prisma.task.findMany({
      where: { id: { in: ids }, laborType: { tenantId } },
      select: { id: true },
    });
  }

  create(data: CreateLaborTypeData): Promise<LaborTypeRecord> {
    return this.prisma.laborType.create({ data });
  }

  async updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateLaborTypeData,
  ): Promise<LaborTypeRecord> {
    const laborType = await this.prisma.laborType.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!laborType) {
      throw new Error(`Labor type with id ${id} not found for tenant ${tenantId}`);
    }

    return this.prisma.laborType.update({
      where: { id: laborType.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.taskIds !== undefined
          ? { tasks: { set: data.taskIds.map((taskId) => ({ id: taskId })) } }
          : {}),
      },
    });
  }

  async deleteForTenant(id: string, tenantId: string): Promise<void> {
    const laborType = await this.prisma.laborType.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!laborType) {
      throw new Error(`Labor type with id ${id} not found for tenant ${tenantId}`);
    }

    await this.prisma.laborType.delete({ where: { id: laborType.id } });
  }
}
