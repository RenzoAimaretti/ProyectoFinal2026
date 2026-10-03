import { InvalidInputError } from '../domain/errors';
import {
  assertDistinctLoadOrders,
  assertRecipeHasItems,
  assertValidDose,
  assertValidLoadOrder,
  orderRecipeItemsByLoadOrder,
} from '../domain/recipe.rules';
import { CreateRecipeItemData } from './recipe.types';

export function assertRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value.trim();
}

export function assertOptionalString(
  value: unknown,
  fieldName: string,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new InvalidInputError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

export function assertRequiredDate(value: unknown, fieldName: string): Date {
  const date = toDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    throw new InvalidInputError(`${fieldName} must be a valid date`);
  }

  return date;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  return typeof value === 'string' ? new Date(value) : null;
}

/**
 * Validates the R009 recipe items and resolves them into a deterministic
 * loading sequence before persistence.
 */
export function normalizeRecipeItems(items: unknown): CreateRecipeItemData[] {
  if (!Array.isArray(items)) {
    throw new InvalidInputError('items must be an array of recipe items');
  }

  assertRecipeHasItems(items);

  const normalized = items.map((item, index) => {
    const source =
      item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : {};

    return {
      inputId: assertRequiredString(source.inputId, `items[${index}].inputId`),
      dose: assertValidDose(source.dose, `items[${index}].dose`),
      unit: assertOptionalString(source.unit, `items[${index}].unit`),
      loadOrder: assertValidLoadOrder(
        source.loadOrder,
        `items[${index}].loadOrder`,
      ),
    };
  });

  assertDistinctLoadOrders(normalized);

  return orderRecipeItemsByLoadOrder(normalized);
}
