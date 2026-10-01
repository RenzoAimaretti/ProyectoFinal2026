import { InvalidInputError, PhotoLimitExceededError } from './errors';
import { PHOTO_ENTITY_TYPES, PhotoEntityType } from './photo-entity-type';

/**
 * R008 (daily report) and CUU06/R014 (reception of inputs): an entity holds at
 * most five backing photos. The album key is `(entityType, entityId)`, the only
 * scope the Photo table carries.
 */
export const MAX_PHOTOS_PER_ENTITY = 5;

export function isPhotoEntityType(value: unknown): value is PhotoEntityType {
  return (
    typeof value === 'string' &&
    (PHOTO_ENTITY_TYPES as readonly string[]).includes(value)
  );
}

export function assertPhotoEntityType(value: unknown): PhotoEntityType {
  if (!isPhotoEntityType(value)) {
    throw new InvalidInputError(
      `entityType must be one of: ${PHOTO_ENTITY_TYPES.join(', ')}`,
    );
  }

  return value;
}

export function assertRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value.trim();
}

/**
 * `orderIndex` is the position of the photo inside its album. It matches the
 * schema default of 0 when the caller does not send one.
 */
export function assertOrderIndex(value: unknown): number {
  if (value === undefined) {
    return 0;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new InvalidInputError('orderIndex must be a non-negative integer');
  }

  return value;
}

export function assertPhotoLimit(
  entityType: PhotoEntityType,
  entityId: string,
  currentCount: number,
): void {
  if (currentCount >= MAX_PHOTOS_PER_ENTITY) {
    throw new PhotoLimitExceededError(
      entityType,
      entityId,
      MAX_PHOTOS_PER_ENTITY,
    );
  }
}
