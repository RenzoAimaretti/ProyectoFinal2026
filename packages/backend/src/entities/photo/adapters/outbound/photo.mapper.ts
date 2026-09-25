import { PhotoRecord } from '../../application/photo.types';
import { PhotoEntityType } from '../../domain/photo-entity-type';

export type PhotoRow = {
  id: string;
  entityType: PhotoEntityType;
  entityId: string;
  localPath: string;
  orderIndex: number;
  createdAt: Date;
};

export function toPhotoRecord(photo: PhotoRow): PhotoRecord {
  return {
    id: photo.id,
    entityType: photo.entityType,
    entityId: photo.entityId,
    localPath: photo.localPath,
    orderIndex: photo.orderIndex,
    createdAt: photo.createdAt,
  };
}
