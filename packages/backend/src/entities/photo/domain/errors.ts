import { PhotoEntityType } from './photo-entity-type';

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

export class EntityNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntityNotFoundError';
  }
}

/**
 * R008: a daily report holds at most five backing photos. The reception of
 * inputs (CUU06/R014) uses the same album limit.
 */
export class PhotoLimitExceededError extends Error {
  constructor(
    readonly entityType: PhotoEntityType,
    readonly entityId: string,
    readonly limit: number,
  ) {
    super(
      `${entityType} ${entityId} already holds the maximum of ${limit} photos`,
    );
    this.name = 'PhotoLimitExceededError';
  }
}
