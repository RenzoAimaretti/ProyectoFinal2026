import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { FarmRepositoryPort } from '../../application/farm.ports';
import {
  CreateFarmInput,
  FarmRecord,
  UpdateFarmInput,
} from '../../application/farm.types';

@Injectable()
export class PrismaFarmRepository implements FarmRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTenantId(tenantId: string): Promise<FarmRecord[]> {
    return this.prisma.farm.findMany({
      where: { client: { tenantId } },
    });
  }

  findByIdForTenant(id: string, tenantId: string): Promise<FarmRecord | null> {
    return this.prisma.farm.findFirst({
      where: { id, client: { tenantId } },
    });
  }

  findByNameAndClientId(name: string, clientId: string): Promise<FarmRecord | null> {
    return this.prisma.farm.findFirst({
      where: { name, clientId },
    });
  }

  create(data: CreateFarmInput & { clientId: string }): Promise<FarmRecord> {
    return this.prisma.farm.create({
      data: {
        name: data.name,
        location: data.location,
        clientId: data.clientId,
        surface: data.surface,
      },
    });
  }

  async updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateFarmInput,
  ): Promise<FarmRecord> {
    const farm = await this.prisma.farm.findFirst({
      where: { id, client: { tenantId } },
      select: { id: true },
    });

    if (!farm) {
      throw new Error(`Farm with id ${id} not found for tenant ${tenantId}`);
    }

    return this.prisma.farm.update({
      where: { id: farm.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.surface !== undefined ? { surface: data.surface } : {}),
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
      },
    });
  }
}
