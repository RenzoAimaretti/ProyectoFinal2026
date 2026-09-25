import { InvalidInputError } from '../domain/errors';

export function assertRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value.trim();
}

export function assertRequiredDate(value: unknown, fieldName: string): Date {
  const date = toDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    throw new InvalidInputError(`${fieldName} must be a valid date`);
  }

  return date;
}

export function assertOptionalNumber(
  value: unknown,
  fieldName: string,
): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidInputError(`${fieldName} must be a number`);
  }

  return value;
}

export function assertOptionalString(
  value: unknown,
  fieldName: string,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new InvalidInputError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  return typeof value === 'string' ? new Date(value) : null;
}
