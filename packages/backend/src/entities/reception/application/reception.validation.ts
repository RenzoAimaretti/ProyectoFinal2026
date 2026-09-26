import { InvalidInputError, InvalidRelationError } from '../domain/errors';
import {
  assertDistinctItemInputs,
  assertPositiveNumber,
} from '../domain/reception.rules';
import {
  CreateReceptionItemData,
  ReceptionItemValidation,
} from './reception.types';

export function assertRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  return value.trim();
}

export function assertRequiredDate(value: unknown, fieldName: string): Date {
  const date =
    value instanceof Date
      ? value
      : typeof value === 'string'
        ? new Date(value)
        : null;

  if (!date || Number.isNaN(date.getTime())) {
    throw new InvalidInputError(`${fieldName} must be a valid date`);
  }

  return date;
}

export type DeclaredReceptionItem = {
  inputId: string;
  quantity: number;
};

/**
 * Validates the declared items of a reception before any port is touched. The
 * unit is not read here because it belongs to the input catalogue.
 */
export function normalizeReceptionItems(
  items: unknown,
): DeclaredReceptionItem[] {
  if (!Array.isArray(items)) {
    throw new InvalidInputError('items must be an array of reception items');
  }

  if (items.length === 0) {
    throw new InvalidInputError('items must contain at least one input');
  }

  const normalized = items.map((item, index) => {
    const source =
      item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : {};

    return {
      inputId: assertRequiredString(source.inputId, `items[${index}].inputId`),
      quantity: assertPositiveNumber(
        source.quantity,
        `items[${index}].quantity`,
      ),
    };
  });

  assertDistinctItemInputs(normalized);

  return normalized;
}

/**
 * Validates the agreed quantities of a reception decision before any port is
 * touched: validation must supply exactly one strictly positive and finite
 * quantity per declared item (R014). Whether the decision covers exactly the
 * items of the stored reception is asserted against that reception by the
 * domain rule, because only the reception knows what was declared.
 */
export function normalizeValidatedItems(
  items: unknown,
): ReceptionItemValidation[] {
  if (!Array.isArray(items)) {
    throw new InvalidInputError(
      'items must be an array of validated reception items',
    );
  }

  if (items.length === 0) {
    throw new InvalidInputError(
      'items must contain at least one validated reception item',
    );
  }

  return items.map((item, index) => {
    const source =
      item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : {};

    return {
      inputId: assertRequiredString(source.inputId, `items[${index}].inputId`),
      validatedQuantity: assertPositiveNumber(
        source.validatedQuantity,
        `items[${index}].validatedQuantity`,
      ),
    };
  });
}

/**
 * The declared items are persisted with the catalogue unit of each input, so a
 * single `{ clientId, inputId }` stock balance never mixes units. Inputs that
 * are not part of the client tenant catalogue are refused instead of stored.
 */
export function resolveCatalogueUnits(
  items: readonly DeclaredReceptionItem[],
  catalogue: readonly { id: string; unit: string }[],
): CreateReceptionItemData[] {
  const unitsById = new Map(catalogue.map((input) => [input.id, input.unit]));
  const missingInputIds = items
    .map((item) => item.inputId)
    .filter((inputId) => !unitsById.has(inputId));

  if (missingInputIds.length > 0) {
    throw new InvalidRelationError(
      `Reception inputs do not belong to the client tenant: ${missingInputIds.join(', ')}`,
    );
  }

  return items.map((item) => ({
    inputId: item.inputId,
    quantity: item.quantity,
    unit: unitsById.get(item.inputId) as string,
  }));
}
