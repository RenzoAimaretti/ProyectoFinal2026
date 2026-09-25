import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PhotoRepositoryPort } from '../../application/photo.ports';
import { PhotoRecord } from '../../application/photo.types';
import { PhotoEntityType } from '../../domain/photo-entity-type';
import { toPhotoRecord } from './photo.mapper';

/**
 * The album order is the stored `orderIndex`; `createdAt` and `id` keep the
 * listing deterministic when several photos share a position.
 */
const PHOTO_ALBUM_ORDER_BY = [
  { orderIndex: 'asc' as const },
  { createdAt: 'asc' as const },
  { id: 'asc' as const },
];

@Injectable()
export class PrismaPhotoRepository implements PhotoRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEntity(
    entityType: PhotoEntityType,
    entityId: string,
  ): Promise<PhotoRecord[]> {
    const photos = await this.prisma.photo.findMany({
      where: { entityType, entityId },
      orderBy: PHOTO_ALBUM_ORDER_BY,
    });

    return photos.map((photo) => toPhotoRecord(photo));
  }

  async deleteFromEntity(
    id: string,
    entityType: PhotoEntityType,
    entityId: string,
  ): Promise<boolean> {
    const { count } = await this.prisma.photo.deleteMany({
      where: { id, entityType, entityId },
    });

    return count > 0;
  }
}
