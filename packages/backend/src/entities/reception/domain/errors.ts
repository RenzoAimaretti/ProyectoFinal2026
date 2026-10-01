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

export class EntityNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntityNotFoundError';
  }
}

/**
 * A reception is decided exactly once. Any other change of state is a protocol
 * violation, not a business outcome.
 */
export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateTransitionError';
  }
}
