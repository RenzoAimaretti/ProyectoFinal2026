import { InvalidInputError } from '../domain/errors';
import { USER_ROLE_VALUES, UserRoleValue } from './user.types';

export function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }
}

export function assertValidRole(role: unknown): asserts role is UserRoleValue {
  if (typeof role !== 'string' || !USER_ROLE_VALUES.includes(role as UserRoleValue)) {
    throw new InvalidInputError(`role must be one of: ${USER_ROLE_VALUES.join(', ')}`);
  }
}
