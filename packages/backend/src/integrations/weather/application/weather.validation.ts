import { InvalidInputError } from '../../shared/domain/errors';

export function assertRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value.trim();
}

export function assertLatitude(value: unknown): number {
  return assertCoordinate(value, 'lat', 90);
}

export function assertLongitude(value: unknown): number {
  return assertCoordinate(value, 'lon', 180);
}

/**
 * Acepta un número o el string de un query param, y rechaza cualquier valor no
 * finito o fuera de rango. Hand-rolled a propósito: class-validator solo vive en
 * `auth/dto/`.
 */
function assertCoordinate(
  value: unknown,
  fieldName: string,
  max: number,
): number {
  const parsed = toFiniteNumber(value);

  if (parsed === null || Math.abs(parsed) > max) {
    throw new InvalidInputError(
      `${fieldName} must be a finite number between -${max} and ${max}`,
    );
  }

  return parsed;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
