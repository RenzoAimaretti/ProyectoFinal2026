import { InvalidInputError } from '../domain/errors';

export function assertOptionalClientId(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new InvalidInputError('id must be a UUID');
  }
  return value.toLowerCase();
}

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
