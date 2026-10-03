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

/**
 * Accepted image mime types for a base64 data URL and the file extension each
 * one maps to when stored on disk.
 */
export const ALLOWED_PHOTO_MIME_TYPES: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

/** Maximum size of the decoded image, in bytes (6 MB). */
export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

const BASE64_DATA_URL_PATTERN =
  /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

export type ParsedPhotoDataUrl = {
  mimeType: string;
  extension: string;
  base64: string;
  byteLength: number;
};

/**
 * Number of bytes a base64 payload decodes to, derived from its length and
 * padding so the domain never needs a Node `Buffer`.
 */
function base64ByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;

  return (base64.length / 4) * 3 - padding;
}

/**
 * Parses and validates the base64 image data URL a client sends when attaching
 * a photo. It accepts only png, jpeg, jpg and webp, rejects anything that is not
 * a well-formed base64 data URL, and refuses payloads above `MAX_PHOTO_BYTES`
 * once decoded. Every rejection is an `InvalidInputError` so the inbound adapter
 * can answer 400.
 */
export function parsePhotoDataUrl(value: unknown): ParsedPhotoDataUrl {
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidInputError('dataUrl is required');
  }

  const match = BASE64_DATA_URL_PATTERN.exec(value);

  if (!match) {
    throw new InvalidInputError(
      'dataUrl must be a base64 image of type png, jpeg, jpg or webp',
    );
  }

  const [, mimeType, base64] = match;

  if (base64.length % 4 !== 0) {
    throw new InvalidInputError('dataUrl must contain valid base64 image data');
  }

  const byteLength = base64ByteLength(base64);

  if (byteLength === 0) {
    throw new InvalidInputError('dataUrl must contain image data');
  }

  if (byteLength > MAX_PHOTO_BYTES) {
    throw new InvalidInputError(
      `dataUrl must not exceed ${MAX_PHOTO_BYTES} bytes`,
    );
  }

  return {
    mimeType,
    extension: ALLOWED_PHOTO_MIME_TYPES[mimeType],
    base64,
    byteLength,
  };
}
