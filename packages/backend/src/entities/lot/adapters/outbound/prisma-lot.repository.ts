import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LotRepositoryPort } from '../../application/lot.ports';
import {
  CreateLotInput,
  LotRecord,
  UpdateLotInput,
} from '../../application/lot.types';

@Injectable()
export class PrismaLotRepository implements LotRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTenantId(tenantId: string): Promise<LotRecord[]> {
    return this.prisma.lot.findMany({
      where: { farm: { client: { tenantId } } },
    });
  }

  findAllByClientId(clientId: string): Promise<LotRecord[]> {
    return this.prisma.lot.findMany({
      where: { farm: { clientId } },
    });
  }

  findByIdForTenant(id: string, tenantId: string): Promise<LotRecord | null> {
    return this.prisma.lot.findFirst({
      where: { id, farm: { client: { tenantId } } },
    });
  }

  findByNameAndFarmId(name: string, farmId: string): Promise<LotRecord | null> {
    return this.prisma.lot.findFirst({
      where: { name, farmId },
    });
  }

  create(data: CreateLotInput): Promise<LotRecord> {
    return this.prisma.lot.create({
      data: {
        name: data.name,
        farmId: data.farmId,
        coords: data.coords,
        area: data.area,
      },
    });
  }

  async updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateLotInput,
  ): Promise<LotRecord> {
    const lot = await this.prisma.lot.findFirst({
      where: { id, farm: { client: { tenantId } } },
      select: { id: true },
    });

    if (!lot) {
      throw new Error(`Lot with id ${id} not found for tenant ${tenantId}`);
    }

    return this.prisma.lot.update({
      where: { id: lot.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.farmId !== undefined ? { farmId: data.farmId } : {}),
        ...(data.coords !== undefined ? { coords: data.coords } : {}),
        ...(data.area !== undefined ? { area: data.area } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }
}
