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

export class DuplicateEntityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateEntityError';
  }
}

/** The expense already has a PENDIENTE suggestion: resolve it first. */
export class PendingSuggestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PendingSuggestionError';
  }
}

/** APROBADA and RECHAZADA suggestions are final. */
export class SuggestionAlreadyResolvedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SuggestionAlreadyResolvedError';
  }
}

/** The write lost a race (serialization failure or a stale read): retry. */
export class ConcurrentModificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrentModificationError';
  }
}
