import { InvalidInputError } from '../domain/errors';

export function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value.trim();
}

export function normalizeRequiredDate(value: unknown, fieldName: string) {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim().length === 0)
  ) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return normalizeOptionalDate(value, fieldName)!;
}

export function normalizeOptionalDate(
  value: unknown,
  fieldName: string,
) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const date =
    value instanceof Date ? value : new Date(value as string | number);

  if (Number.isNaN(date.getTime())) {
    throw new InvalidInputError(`${fieldName} must be a valid date`);
  }

  return date;
}
