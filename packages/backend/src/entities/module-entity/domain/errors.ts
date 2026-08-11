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
