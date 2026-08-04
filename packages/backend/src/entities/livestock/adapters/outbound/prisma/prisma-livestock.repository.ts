import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { LivestockStatus as PrismaLivestockStatus } from '../../../../../../prisma/generated/client';
import { LivestockStatus } from '../../../domain/livestock-status';
import {
  CreateLivestockData,
  LivestockEntity,
  LivestockRepositoryPort,
  UpdateLivestockData,
} from '../../../ports/livestock.repository';

// Mapeo explícito generado ↔ dominio (REQ-A-04): el enum generado por Prisma es un
// const object; la copia de dominio es un enum TS con miembros idénticos. Este es
// el ÚNICO archivo del módulo livestock que importa prisma/generated (REQ-A-04).
const PRISMA_STATUS_TO_DOMAIN: Record<PrismaLivestockStatus, LivestockStatus> =
  {
    ACTIVO: LivestockStatus.ACTIVO,
    VENDIDO: LivestockStatus.VENDIDO,
    MUERTO: LivestockStatus.MUERTO,
    ENFERMO: LivestockStatus.ENFERMO,
  };

const DOMAIN_STATUS_TO_PRISMA: Record<LivestockStatus, PrismaLivestockStatus> =
  {
    [LivestockStatus.ACTIVO]: 'ACTIVO',
    [LivestockStatus.VENDIDO]: 'VENDIDO',
    [LivestockStatus.MUERTO]: 'MUERTO',
    [LivestockStatus.ENFERMO]: 'ENFERMO',
  };

// Fila escalar de Prisma (status en el enum generado) — base del mapeo a entidad.
type LivestockRow = Omit<LivestockEntity, 'status'> & {
  status: PrismaLivestockStatus;
};

@Injectable()
export class PrismaLivestockRepository implements LivestockRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<LivestockEntity[]> {
    const rows = await this.prisma.livestock.findMany();
    return rows.map((row) => this.toEntity(row));
  }

  async findById(id: string): Promise<LivestockEntity | null> {
    const row = await this.prisma.livestock.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByIdWithLotFarm(id: string): Promise<LivestockEntity | null> {
    const row = await this.prisma.livestock.findUnique({
      where: { id },
      include: { lot: { include: { farm: true } } },
    });
    return row ? this.toEntity(row) : null;
  }

  async findByTagNumber(tagNumber: string): Promise<LivestockEntity | null> {
    const row = await this.prisma.livestock.findUnique({
      where: { tagNumber },
    });
    return row ? this.toEntity(row) : null;
  }

  async findByTagNumberExcluding(
    tagNumber: string,
    excludeId: string,
  ): Promise<LivestockEntity | null> {
    const row = await this.prisma.livestock.findFirst({
      where: { tagNumber, id: { not: excludeId } },
    });
    return row ? this.toEntity(row) : null;
  }

  async create(data: CreateLivestockData): Promise<LivestockEntity> {
    const row = await this.prisma.livestock.create({
      data: {
        companyId: data.companyId,
        lotId: data.lotId,
        tagNumber: data.tagNumber,
        breed: data.breed,
        species: data.species,
        birthDate: data.birthDate,
        sex: data.sex,
      },
    });
    return this.toEntity(row);
  }

  async update(
    id: string,
    data: UpdateLivestockData,
  ): Promise<LivestockEntity> {
    const row = await this.prisma.livestock.update({
      where: { id },
      data: {
        ...(data.companyId !== undefined ? { companyId: data.companyId } : {}),
        ...(data.lotId !== undefined ? { lotId: data.lotId } : {}),
        ...(data.tagNumber !== undefined ? { tagNumber: data.tagNumber } : {}),
        ...(data.breed !== undefined ? { breed: data.breed } : {}),
        ...(data.species !== undefined ? { species: data.species } : {}),
        ...(data.birthDate !== undefined ? { birthDate: data.birthDate } : {}),
        ...(data.sex !== undefined ? { sex: data.sex } : {}),
        ...(data.status !== undefined
          ? { status: DOMAIN_STATUS_TO_PRISMA[data.status] }
          : {}),
      },
    });
    return this.toEntity(row);
  }

  async delete(id: string): Promise<LivestockEntity> {
    const row = await this.prisma.livestock.delete({ where: { id } });
    return this.toEntity(row);
  }

  private toEntity(row: LivestockRow): LivestockEntity {
    return {
      id: row.id,
      companyId: row.companyId,
      lotId: row.lotId,
      tagNumber: row.tagNumber,
      species: row.species,
      breed: row.breed,
      sex: row.sex,
      birthDate: row.birthDate,
      status: PRISMA_STATUS_TO_DOMAIN[row.status],
      entryDate: row.entryDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
      deleted: row.deleted,
    };
  }
}
