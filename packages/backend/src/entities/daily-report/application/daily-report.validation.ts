import { InvalidInputError } from '../domain/errors';
import {
  assertDistinctItemInputs,
  assertPositiveNumber,
} from '../domain/daily-report.rules';
import { CreateDailyReportItemData } from './daily-report.types';

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
 * Validates the consumption items of the report and resolves them to the
 * persisted shape before the aggregate write.
 */
export function normalizeDailyReportItems(
  items: unknown,
): CreateDailyReportItemData[] {
  if (!Array.isArray(items)) {
    throw new InvalidInputError('items must be an array of daily report items');
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
      inputId: assertRequiredString(
        source.inputId,
        `items[${index}].inputId`,
      ),
      quantity: assertPositiveNumber(
        source.quantity,
        `items[${index}].quantity`,
      ),
      unit: assertRequiredString(source.unit, `items[${index}].unit`),
    };
  });

  assertDistinctItemInputs(normalized);

  return normalized;
}
