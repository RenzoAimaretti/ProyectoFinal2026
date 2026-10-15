export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

export class InvalidRelationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRelationError';
  }
}

export class DuplicateEntityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateEntityError';
  }
}

export class EntityNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntityNotFoundError';
  }
}

/**
 * R7: a prescription is frozen once its task has started (EN_PROGRESO or
 * FINALIZADA) and can only be archived afterwards.
 */
export class PrescriptionFrozenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrescriptionFrozenError';
  }
}
