import { InvalidInputError } from '../domain/errors';
import { UpdateExpenseCategoryInput } from './expense-category.types';

export function requiredName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InvalidInputError('name is required');
  }
  return value.trim();
}

export function updatePayload(value: unknown): UpdateExpenseCategoryInput {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !Object.keys(value).length
  ) {
    throw new InvalidInputError('Update payload is required');
  }

  const input = value as { name?: unknown; active?: unknown };
  const data: UpdateExpenseCategoryInput = {};
  if ('name' in input) data.name = requiredName(input.name);
  if ('active' in input) {
    if (typeof input.active !== 'boolean') {
      throw new InvalidInputError('active must be boolean');
    }
    data.active = input.active;
  }
  if (!Object.keys(data).length)
    throw new InvalidInputError('No supported fields');
  return data;
}
