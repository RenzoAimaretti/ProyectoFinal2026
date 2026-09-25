import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ClientRepositoryPort } from '../../application/client.ports';
import {
  ClientRecord,
  CreateClientData,
  UpdateClientInput,
} from '../../application/client.types';

@Injectable()
export class PrismaClientRepository implements ClientRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTenantId(tenantId: string): Promise<ClientRecord[]> {
    return this.prisma.client.findMany({ where: { tenantId } });
  }

  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<ClientRecord | null> {
    return this.prisma.client.findFirst({ where: { id, tenantId } });
  }

  findByNameAndTenantId(
    name: string,
    tenantId: string,
  ): Promise<ClientRecord | null> {
    return this.prisma.client.findFirst({ where: { name, tenantId } });
  }

  create(data: CreateClientData): Promise<ClientRecord> {
    return this.prisma.client.create({ data });
  }

  async updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateClientInput,
  ): Promise<ClientRecord> {
    const { count } = await this.prisma.client.updateMany({
      where: { id, tenantId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.cuit !== undefined ? { cuit: data.cuit } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    if (count === 0) {
      throw new Error(`Client with id ${id} not found for tenant ${tenantId}`);
    }

    return this.prisma.client.findFirstOrThrow({ where: { id, tenantId } });
  }
}
