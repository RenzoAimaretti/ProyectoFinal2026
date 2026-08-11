import { InvalidInputError } from '../domain/errors';

export function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value;
}
