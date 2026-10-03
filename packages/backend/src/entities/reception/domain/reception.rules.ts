import { InvalidInputError, InvalidStateTransitionError } from './errors';
import {
  RECEPTION_INITIAL_STATUS,
  ReceptionStatus,
} from './reception-status';

/**
 * A reception item always declares a strictly positive quantity. Zero or
 * negative amounts cannot be delivered and would corrupt the stock balance.
 */
export function assertPositiveNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new InvalidInputError(`${fieldName} must be a number greater than 0`);
  }

  return value;
}

/**
 * A reception declares each input at most once; repeated inputs would double
 * count the same delivery and, on validation, the same stock entry.
 */
export function assertDistinctItemInputs(
  items: readonly { inputId: string }[],
): void {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.inputId)) {
      throw new InvalidInputError(
        `Reception items must not repeat the input ${item.inputId}`,
      );
    }

    seen.add(item.inputId);
  }
}

/**
 * Validation is a mutual agreement over the declared delivery (R014): the
 * decision must supply exactly one validated quantity per declared input. A
 * missing input would leave a delivery unvalidated and would enter less stock
 * than agreed; an unknown or repeated input has no single declared quantity to
 * compare against.
 */
export function assertValidationCoversItems(
  declaredItems: readonly { inputId: string }[],
  validatedItems: readonly { inputId: string }[],
): void {
  const declared = new Set(declaredItems.map((item) => item.inputId));
  const validated = new Set<string>();

  for (const item of validatedItems) {
    if (!declared.has(item.inputId)) {
      throw new InvalidInputError(
        `Input ${item.inputId} is not part of the reception`,
      );
    }

    if (validated.has(item.inputId)) {
      throw new InvalidInputError(
        `Reception item ${item.inputId} was validated more than once`,
      );
    }

    validated.add(item.inputId);
  }

  for (const inputId of declared) {
    if (!validated.has(inputId)) {
      throw new InvalidInputError(
        `Reception item ${inputId} was not validated`,
      );
    }
  }
}

/**
 * R015: the shortage (negative) or surplus (positive) of a reception item is
 * observable as the validated quantity minus the expected quantity. A pending
 * item has not been agreed yet, so it has no observable variance.
 */
export function itemQuantityVariance(item: {
  quantity: number;
  validatedQuantity: number | null;
}): number | null {
  return item.validatedQuantity === null
    ? null
    : item.validatedQuantity - item.quantity;
}

/**
 * Validation and rejection are terminal decisions over a pending reception.
 */
export function assertPendingValidation(reception: {
  status: ReceptionStatus;
}): void {
  if (reception.status !== RECEPTION_INITIAL_STATUS) {
    throw new InvalidStateTransitionError(
      `A reception in status ${reception.status} cannot be decided again`,
    );
  }
}

/**
 * A rejection without a reason cannot be audited, so it is refused.
 */
export function assertRejectionReason(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError('rejectionReason is required');
  }

  return value.trim();
}
