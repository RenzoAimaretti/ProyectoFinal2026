import { InvalidInputError } from '../domain/errors';
import { TASK_STATUS_VALUES, TaskStatusValue } from './task.types';

export function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value;
}

export function assertNonEmptyObject(value: unknown) {
  if (!value || typeof value !== 'object' || Object.keys(value).length === 0) {
    throw new InvalidInputError('No data provided for update');
  }

  return value as Record<string, unknown>;
}

export function normalizeOptionalDate(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new InvalidInputError(`${fieldName} must be a valid date`);
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new InvalidInputError(`${fieldName} must be a valid date`);
  }

  return date;
}

export function normalizeRequiredDate(value: unknown, fieldName: string) {
  const date = normalizeOptionalDate(value, fieldName);

  if (!date) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return date;
}

export function normalizeTaskStatus(value: unknown) {
  if (typeof value !== 'string' || !TASK_STATUS_VALUES.includes(value as TaskStatusValue)) {
    throw new InvalidInputError(`Invalid status value. Allowed values are: ${TASK_STATUS_VALUES.join(', ')}`);
  }

  return value as TaskStatusValue;
}
