import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PhotoRepositoryPort } from '../../application/photo.ports';
import { AttachPhotoData, PhotoRecord } from '../../application/photo.types';
import { PhotoEntityType } from '../../domain/photo-entity-type';

type PhotoRow = {
  id: string;
  entityType: PhotoEntityType;
  entityId: string;
  localPath: string;
  orderIndex: number;
  createdAt: Date;
};

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

  countByEntity(
    entityType: PhotoEntityType,
    entityId: string,
  ): Promise<number> {
    return this.prisma.photo.count({ where: { entityType, entityId } });
  }

  async findByEntity(
    entityType: PhotoEntityType,
    entityId: string,
  ): Promise<PhotoRecord[]> {
    const photos = await this.prisma.photo.findMany({
      where: { entityType, entityId },
      orderBy: PHOTO_ALBUM_ORDER_BY,
    });

    return photos.map((photo) => this.toPhotoRecord(photo));
  }

  async create(data: AttachPhotoData): Promise<PhotoRecord> {
    const photo = await this.prisma.photo.create({ data });

    return this.toPhotoRecord(photo);
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

  private toPhotoRecord(photo: PhotoRow): PhotoRecord {
    return {
      id: photo.id,
      entityType: photo.entityType,
      entityId: photo.entityId,
      localPath: photo.localPath,
      orderIndex: photo.orderIndex,
      createdAt: photo.createdAt,
    };
  }
}
