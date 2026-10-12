import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../prisma/generated/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GeoJsonPolygon } from '../../domain/lot-polygon';
import { LotRepositoryPort } from '../../application/lot.ports';
import {
  CreateLotInput,
  LotRecord,
  UpdateLotInput,
} from '../../application/lot.types';

/**
 * `polygon` comes back from Prisma as `JsonValue` and is narrowed here. The
 * lot module's own writes all pass through `LotPolygon.fromGeoJson`, so a row
 * written by `POST /lots` is always valid. That is not a database-wide
 * invariant: `packages/backend/src/entities/client/adapters/outbound/prisma-client.repository.ts`
 * also creates lots with `tx.lot.create`, and a direct SQL write can bypass
 * validation entirely. Those writers must not put a polygon in this column.
 */
type LotRow = Omit<LotRecord, 'polygon'> & { polygon: unknown };

@Injectable()
export class PrismaLotRepository implements LotRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByTenantId(tenantId: string): Promise<LotRecord[]> {
    const lots = await this.prisma.lot.findMany({
      where: { farm: { client: { tenantId } } },
    });

    return lots.map((lot) => this.toRecord(lot));
  }

  async findAllByClientId(clientId: string): Promise<LotRecord[]> {
    const lots = await this.prisma.lot.findMany({
      where: { farm: { clientId } },
    });

    return lots.map((lot) => this.toRecord(lot));
  }

  async findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<LotRecord | null> {
    const lot = await this.prisma.lot.findFirst({
      where: { id, farm: { client: { tenantId } } },
    });

    return lot ? this.toRecord(lot) : null;
  }

  async findByNameAndFarmId(
    name: string,
    farmId: string,
  ): Promise<LotRecord | null> {
    const lot = await this.prisma.lot.findFirst({ where: { name, farmId } });

    return lot ? this.toRecord(lot) : null;
  }

  async create(data: CreateLotInput): Promise<LotRecord> {
    const lot = await this.prisma.lot.create({
      data: {
        name: data.name,
        farmId: data.farmId,
        ...(data.coords !== undefined ? { coords: data.coords } : {}),
        ...(data.polygon !== undefined
          ? { polygon: data.polygon as Prisma.InputJsonValue }
          : {}),
        area: data.area,
      },
    });

    return this.toRecord(lot);
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

    const updated = await this.prisma.lot.update({
      where: { id: lot.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.farmId !== undefined ? { farmId: data.farmId } : {}),
        ...(data.coords !== undefined ? { coords: data.coords } : {}),
        ...(data.polygon !== undefined
          ? { polygon: data.polygon as Prisma.InputJsonValue }
          : {}),
        ...(data.area !== undefined ? { area: data.area } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });

    return this.toRecord(updated);
  }

  private toRecord(lot: LotRow): LotRecord {
    return { ...lot, polygon: lot.polygon as GeoJsonPolygon | null };
  }
}
