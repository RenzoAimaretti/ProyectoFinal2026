import { InvalidInputError } from '../domain/errors';

export function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value.trim();
}

export function normalizeOptionalString(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new InvalidInputError(`${fieldName} must be a string`);
  }

  return value;
}

export function assertOptionalBoolean(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new InvalidInputError(`${fieldName} must be a boolean`);
  }

  return value;
}

export function assertNonEmptyObject(value: unknown) {
  if (!value || typeof value !== 'object' || Object.keys(value).length === 0) {
    throw new InvalidInputError('No data provided for update');
  }

  return value as Record<string, unknown>;
}

export function normalizeNullableString(
  value: unknown,
  fieldName: string,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new InvalidInputError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

export function assertPositiveNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new InvalidInputError(`${fieldName} must be a positive number`);
  }

  return value;
}

export function assertValidEmail(value: unknown): string {
  const email = assertRequiredString(value, 'email');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new InvalidInputError('email must be a valid email address');
  }

  return email;
}
