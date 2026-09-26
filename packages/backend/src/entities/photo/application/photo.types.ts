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
