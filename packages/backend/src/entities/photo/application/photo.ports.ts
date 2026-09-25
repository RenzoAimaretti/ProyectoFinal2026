import { PhotoEntityType } from '../domain/photo-entity-type';
import { AttachPhotoData, PhotoRecord } from './photo.types';

export const PHOTO_REPOSITORY = Symbol('PHOTO_REPOSITORY');

/**
 * Every operation is scoped by the `(entityType, entityId)` album, the only
 * owner the Photo table stores. The table has no company or tenant column, so
 * no broader scope can be enforced at this boundary.
 */
export interface PhotoRepositoryPort {
  countByEntity(entityType: PhotoEntityType, entityId: string): Promise<number>;
  findByEntity(
    entityType: PhotoEntityType,
    entityId: string,
  ): Promise<PhotoRecord[]>;
  create(data: AttachPhotoData): Promise<PhotoRecord>;
  deleteFromEntity(
    id: string,
    entityType: PhotoEntityType,
    entityId: string,
  ): Promise<boolean>;
}
