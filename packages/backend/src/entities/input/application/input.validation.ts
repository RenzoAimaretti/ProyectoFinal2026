import { InvalidInputError } from '../domain/errors';
import { INPUT_UNITS, InputUnit, isInputUnit } from '../domain/input-unit';

export function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value.trim();
}

export function assertInputUnit(value: unknown): InputUnit {
  if (!isInputUnit(value)) {
    throw new InvalidInputError(`unit must be one of: ${INPUT_UNITS.join(', ')}`);
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
