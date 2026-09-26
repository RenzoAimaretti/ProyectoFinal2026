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
 * A daily report is approved or rejected exactly once. Any other change of
 * state is a protocol violation, not a business outcome.
 */
export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Approving a daily report consumes client stock. The consumption is refused
 * when the stored balance cannot cover it, so the inventory never goes negative
 * and the report is not approved without its deduction (R017).
 */
export class InsufficientStockError extends Error {
  constructor(
    readonly clientId: string,
    readonly inputId: string,
    readonly required: number,
    readonly available: number,
  ) {
    super(
      `Stock of input ${inputId} for client ${clientId} is ${available} and cannot cover ${required}`,
    );
    this.name = 'InsufficientStockError';
  }
}
