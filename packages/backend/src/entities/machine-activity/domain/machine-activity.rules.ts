import { InvalidInputError } from './errors';
import {
  MACHINE_ACTIVITY_TYPES,
  MachineActivityType,
} from './machine-activity-type';

/**
 * The nullable payload of a machine activity. Only the fields required by the
 * activity type must be present; the rest stay null.
 */
export type MachineActivityFieldValues = {
  type: MachineActivityType;
  date: Date;
  liters: number | null;
  cost: number | null;
  spareParts: string | null;
  usageHours: number | null;
  hectares: number | null;
};

export function isMachineActivityType(
  value: unknown,
): value is MachineActivityType {
  return (
    typeof value === 'string' &&
    (MACHINE_ACTIVITY_TYPES as readonly string[]).includes(value)
  );
}

export function assertMachineActivityType(
  value: unknown,
): MachineActivityType {
  if (!isMachineActivityType(value)) {
    throw new InvalidInputError(
      `type must be one of: ${MACHINE_ACTIVITY_TYPES.join(', ')}`,
    );
  }

  return value;
}

export function assertPositiveNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new InvalidInputError(`${fieldName} must be a number greater than 0`);
  }

  return value;
}

export function assertRequiredText(
  value: string | null,
  fieldName: string,
): string {
  if (value === null || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value;
}

/**
 * An activity records what already happened, so it can never be dated in the
 * future.
 */
export function assertNotFutureDate(date: Date, now: Date): void {
  if (date.getTime() > now.getTime()) {
    throw new InvalidInputError('date must not be in the future');
  }
}

/**
 * Enforces the fields required by each activity type:
 * fuel needs liters, maintenance and repair need a cost plus a work
 * description, and field usage needs hours and hectares.
 */
export function assertMachineActivityFields(
  values: MachineActivityFieldValues,
  now: Date,
): void {
  assertNotFutureDate(values.date, now);

  switch (values.type) {
    case 'COMBUSTIBLE':
      assertPositiveNumber(values.liters, 'liters');
      break;
    case 'MANTENIMIENTO':
    case 'REPARACION':
      assertPositiveNumber(values.cost, 'cost');
      assertRequiredText(values.spareParts, 'spareParts');
      break;
    case 'USO_CAMPO':
      assertPositiveNumber(values.usageHours, 'usageHours');
      assertPositiveNumber(values.hectares, 'hectares');
      break;
  }
}
