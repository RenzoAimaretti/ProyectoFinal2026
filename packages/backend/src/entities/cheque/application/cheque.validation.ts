import { InvalidInputError } from '../domain/errors';

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new InvalidInputError(`${field} is required`);
  return value.trim();
}

export function requiredDate(value: unknown, field: string): Date {
  const date =
    typeof value === 'string' || value instanceof Date ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime()))
    throw new InvalidInputError(`${field} must be a valid date`);
  return date;
}

export function positiveAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    throw new InvalidInputError('amount must be a number greater than 0');
  return value;
}
