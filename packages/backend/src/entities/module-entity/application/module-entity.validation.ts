import { InvalidInputError } from '../domain/errors';

export function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value.trim();
}

export function assertPositivePrice(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    throw new InvalidInputError('price must be greater than zero');
  }

  return value;
}

export function assertNonZeroPrice(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value) || value === 0) {
    throw new InvalidInputError('price is required');
  }

  return value;
}
