import { PhotoEntityType } from '../domain/photo-entity-type';

/** A persisted photo: the album key plus the path of the file it references. */
export type PhotoRecord = {
  id: string;
  entityType: PhotoEntityType;
  entityId: string;
  localPath: string;
  orderIndex: number;
  createdAt: Date;
};

/**
 * The album key is not part of the input: the caller passes the entity that
 * owns the photo, exactly as the schema stores it.
 */
export type AttachPhotoInput = {
  localPath: string;
  orderIndex?: number;
};

export type AttachPhotoData = {
  entityType: PhotoEntityType;
  entityId: string;
  localPath: string;
  orderIndex: number;
};

/**
 * Input of an attach coming from an inbound adapter that carries the image
 * itself as a base64 data URL instead of an already-stored path.
 */
export type AttachPhotoFromDataUrlInput = {
  dataUrl: string;
  orderIndex?: number;
};

/**
 * The decoded payload handed to the storage capability after the data URL has
 * been validated. `base64` is the raw payload without the `data:` prefix.
 */
export type StorePhotoInput = {
  extension: string;
  base64: string;
};
