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

const MAX_OBSERVATIONS_LENGTH = 1000;

/** Accepts an ISO calendar date (`YYYY-MM-DD`) or a full ISO date-time. */
export function assertOptionalWorkDate(value: unknown): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(value)) {
    throw new InvalidInputError('workDate must be an ISO date');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidInputError('workDate must be an ISO date');
  }

  return parsed;
}

/** Normalizes optional notes: trimmed, empty becomes null, bounded length. */
export function assertOptionalNotes(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new InvalidInputError('observations must be text');
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_OBSERVATIONS_LENGTH) {
    throw new InvalidInputError(`observations must be at most ${MAX_OBSERVATIONS_LENGTH} characters`);
  }

  return trimmed;
}
