import { DEFAULT_DOSAGE_BASIS } from '../domain/dosage-basis';
import { normalizeDosageUnit } from '../domain/dosage-unit';
import { InvalidInputError } from '../domain/errors';
import {
  assertDistinctLoadOrders,
  assertRecipeHasItems,
  assertValidDosageBasis,
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

    const inputId = assertRequiredString(
      source.inputId,
      `items[${index}].inputId`,
    );
    const dose = assertValidDose(source.dose, `items[${index}].dose`);

    // R4/decision 13: the basis decides the derived rate unit. It is validated
    // when present and defaults to POR_HECTAREA otherwise, mirroring the stored
    // default, so the unit can always be derived without inventing a basis.
    const dosageBasis =
      source.dosageBasis !== undefined
        ? assertValidDosageBasis(
            source.dosageBasis,
            `items[${index}].dosageBasis`,
          )
        : DEFAULT_DOSAGE_BASIS;

    const normalizedItem: CreateRecipeItemData = {
      inputId,
      dose,
      unit: normalizeDosageUnit(
        source.unit,
        dosageBasis,
        `items[${index}].unit`,
      ),
      loadOrder: assertValidLoadOrder(
        source.loadOrder,
        `items[${index}].loadOrder`,
      ),
    };

    // R4: the basis is left absent when the caller omitted it, so the stored
    // default applies without changing the shape of the already covered
    // lot-scoped items.
    if (source.dosageBasis !== undefined) {
      normalizedItem.dosageBasis = dosageBasis;
    }

    return normalizedItem;
  });

  assertDistinctLoadOrders(normalized);

  return orderRecipeItemsByLoadOrder(normalized);
}
