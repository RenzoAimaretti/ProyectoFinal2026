import { InvalidInputError } from './errors';
import { MachineActivityType } from './machine-activity-type';

export type FuelMovement = 'INCOME' | 'CONSUMPTION';

/** Legacy fuel rows have no discriminator and represent an income. */
export function resolveFuelMovement(
  type: MachineActivityType,
  movement: unknown,
): FuelMovement | null {
  if (type !== 'COMBUSTIBLE') {
    if (movement !== undefined && movement !== null) {
      throw new InvalidInputError('fuelMovement is only valid for COMBUSTIBLE');
    }
    return null;
  }
  if (movement === undefined || movement === null) return 'INCOME';
  if (movement !== 'INCOME' && movement !== 'CONSUMPTION') {
    throw new InvalidInputError('fuelMovement must be INCOME or CONSUMPTION');
  }
  return movement;
}
