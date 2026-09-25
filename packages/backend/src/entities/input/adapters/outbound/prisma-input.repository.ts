import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { InputRepositoryPort } from '../../application/input.ports';
import {
  CreateInputData,
  InputRecord,
  UpdateInputInput,
} from '../../application/input.types';

@Injectable()
export class PrismaInputRepository implements InputRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTenantId(tenantId: string): Promise<InputRecord[]> {
    return this.prisma.input.findMany({ where: { tenantId } });
  }

  findByIdForTenant(id: string, tenantId: string): Promise<InputRecord | null> {
    return this.prisma.input.findFirst({ where: { id, tenantId } });
  }

  findByNameAndTenantId(
    name: string,
    tenantId: string,
  ): Promise<InputRecord | null> {
    return this.prisma.input.findFirst({ where: { name, tenantId } });
  }

  create(data: CreateInputData): Promise<InputRecord> {
    return this.prisma.input.create({ data });
  }

  async updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateInputInput,
  ): Promise<InputRecord> {
    const { count } = await this.prisma.input.updateMany({
      where: { id, tenantId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    if (count === 0) {
      throw new Error(`Input with id ${id} not found for tenant ${tenantId}`);
    }

    return this.prisma.input.findFirstOrThrow({ where: { id, tenantId } });
  }
}
