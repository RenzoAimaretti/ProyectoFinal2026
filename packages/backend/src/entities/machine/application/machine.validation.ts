import { InvalidInputError } from '../domain/errors';
import { MACHINE_STATUS_VALUES, MachineStatusValue } from './machine.types';

export function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value;
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

export function normalizeMachineStatus(value: unknown) {
  if (typeof value !== 'string' || !MACHINE_STATUS_VALUES.includes(value as MachineStatusValue)) {
    throw new InvalidInputError(`Invalid status value. Allowed values are: ${MACHINE_STATUS_VALUES.join(', ')}`);
  }

  return value as MachineStatusValue;
}
