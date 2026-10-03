import { PhotoEntityType } from '../domain/photo-entity-type';
import { AttachPhotoData, PhotoRecord, StorePhotoInput } from './photo.types';

export const PHOTO_REPOSITORY = Symbol('PHOTO_REPOSITORY');
export const PHOTO_ATTACHMENT = Symbol('PHOTO_ATTACHMENT');
export const PHOTO_STORAGE = Symbol('PHOTO_STORAGE');

/**
 * Reads and removes photos. Every operation is scoped by the
 * `(entityType, entityId)` album, the only owner the Photo table stores. The
 * table has no company or tenant column, so no broader scope can be enforced at
 * this boundary.
 *
 * The port deliberately has no `create`: a raw insert could bypass the
 * five-photo limit. Attaching is only available through
 * `PhotoAttachmentPort`, which enforces the limit and the insert atomically.
 */
export interface PhotoRepositoryPort {
  findByEntity(
    entityType: PhotoEntityType,
    entityId: string,
  ): Promise<PhotoRecord[]>;
  deleteFromEntity(
    id: string,
    entityType: PhotoEntityType,
    entityId: string,
  ): Promise<boolean>;
}

/**
 * Capability: attach one photo while enforcing the five-photo limit of its
 * album (R008, CUU06/R014).
 *
 * The count that decides the limit and the insert that consumes the slot must
 * be one atomic decision: a separate read followed by a write lets two
 * concurrent attachments both observe a free slot and both persist, which
 * yields a sixth photo. The adapter owns that atomicity, so this port is the
 * only way into the album.
 */
export interface PhotoAttachmentPort {
  attachWithLimit(data: AttachPhotoData): Promise<PhotoRecord>;
}

/**
 * Capability: persist the bytes of one image and return the public path the API
 * serves it from. Keeping the filesystem behind a port lets the attach use case
 * stay free of Node file APIs and makes the size/mime behavior testable with a
 * fake storage.
 */
export interface PhotoStoragePort {
  store(input: StorePhotoInput): Promise<string>;
}
