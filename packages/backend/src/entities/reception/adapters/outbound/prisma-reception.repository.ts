import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ReceptionRepositoryPort } from '../../application/reception.ports';
import {
  CreateReceptionData,
  ReceptionRecord,
} from '../../application/reception.types';
import {
  RECEPTION_INCLUDE,
  ReceptionPhotoRow,
  ReceptionRow,
  toReceptionRecord,
} from './reception.mapper';

const RECEPTION_PHOTO_ENTITY_TYPE = 'RECEPCION';

/**
 * Photos are a polymorphic side table with no FK to the reception, so they are
 * loaded in a second query keyed by the reception ids and grouped in memory.
 * The order mirrors the photo album order used by the photo hexagon.
 */
const RECEPTION_PHOTO_ORDER_BY = [
  { orderIndex: 'asc' as const },
  { createdAt: 'asc' as const },
  { id: 'asc' as const },
];

@Injectable()
export class PrismaReceptionRepository implements ReceptionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateReceptionData): Promise<ReceptionRecord> {
    const reception = await this.prisma.reception.create({
      data: {
        clientId: data.clientId,
        date: data.date,
        status: data.status,
        items: {
          create: data.items.map((item) => ({
            inputId: item.inputId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: RECEPTION_INCLUDE,
    });

    return toReceptionRecord(reception);
  }

  async findByIdForClient(
    id: string,
    clientId: string,
  ): Promise<ReceptionRecord | null> {
    const reception = await this.prisma.reception.findFirst({
      where: { id, clientId },
      include: RECEPTION_INCLUDE,
    });

    if (!reception) {
      return null;
    }

    const [withPhotos] = await this.withPhotos([reception]);

    return toReceptionRecord(withPhotos);
  }

  async findAllByClient(clientId: string): Promise<ReceptionRecord[]> {
    const receptions = await this.prisma.reception.findMany({
      where: { clientId },
      include: RECEPTION_INCLUDE,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });

    const withPhotos = await this.withPhotos(receptions);

    return withPhotos.map((reception) => toReceptionRecord(reception));
  }

  async findAllByTenant(tenantId: string): Promise<ReceptionRecord[]> {
    const receptions = await this.prisma.reception.findMany({
      where: { client: { tenantId } },
      include: RECEPTION_INCLUDE,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });

    const withPhotos = await this.withPhotos(receptions);

    return withPhotos.map((reception) => toReceptionRecord(reception));
  }

  async findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<ReceptionRecord | null> {
    const reception = await this.prisma.reception.findFirst({
      where: { id, client: { tenantId } },
      include: RECEPTION_INCLUDE,
    });

    if (!reception) {
      return null;
    }

    const [withPhotos] = await this.withPhotos([reception]);

    return toReceptionRecord(withPhotos);
  }

  /**
   * Attaches the reception photos to each row without an N+1 query: one query
   * for the whole page, then grouping in memory.
   */
  private async withPhotos(
    receptions: ReceptionRow[],
  ): Promise<ReceptionRow[]> {
    const receptionIds = receptions.map((reception) => reception.id);

    const photos = receptionIds.length
      ? await this.prisma.photo.findMany({
          where: {
            entityType: RECEPTION_PHOTO_ENTITY_TYPE,
            entityId: { in: receptionIds },
          },
          orderBy: RECEPTION_PHOTO_ORDER_BY,
        })
      : [];

    const photosByReception = new Map<string, ReceptionPhotoRow[]>();

    for (const photo of photos) {
      const album = photosByReception.get(photo.entityId) ?? [];

      album.push({
        id: photo.id,
        localPath: photo.localPath,
        orderIndex: photo.orderIndex,
      });
      photosByReception.set(photo.entityId, album);
    }

    return receptions.map((reception) => ({
      ...reception,
      photos: photosByReception.get(reception.id) ?? [],
    }));
  }
}
