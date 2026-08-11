import { InvalidInputError } from '../domain/errors';

export function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value.trim();
}

export function assertPositiveNumber(value: unknown, fieldName: string) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    throw new InvalidInputError(`${fieldName} must be a positive number`);
  }

  return value;
}
