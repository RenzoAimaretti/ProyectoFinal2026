export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
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

/** The category still has expenses (soft-deleted ones included), so it cannot be deleted. */
export class CategoryInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CategoryInUseError';
  }
}
