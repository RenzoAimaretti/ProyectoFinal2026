import { InvalidInputError } from '../domain/errors';

export function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value;
}

export function assertOptionalPositiveNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new InvalidInputError(`${fieldName} must be a number greater than 0`);
  }
  return value;
}
