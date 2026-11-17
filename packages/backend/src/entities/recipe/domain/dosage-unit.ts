import { InvalidInputError } from './errors';
import { assertValidDosageBasis } from './recipe.rules';

/**
 * Decision 13: the persisted row unit is a RATE, so a stored `unit` next to a
 * `dosageBasis` is unambiguous. Any pre-existing rate suffix the caller sends
 * (`/ha`, `/100 L`, `/100L`, with optional spaces and any casing) is stripped
 * before the correct suffix is appended, which keeps normalisation idempotent
 * and tolerant of the raw values the old form used to store.
 */
const RATE_SUFFIX_PATTERN = /\s*\/\s*(?:ha|100\s*l)\s*$/i;

/**
 * Decision 13: derives the row's rate unit from its dosage basis:
 * `POR_HECTAREA` -> `<base>/ha`, `CONCENTRACION` -> `<base>/100 L`.
 *
 * A missing or blank unit stays `null`: no unit is invented when the caller
 * sent none. The function is pure and never mutates its input.
 */
export function normalizeDosageUnit(
  unit: unknown,
  dosageBasis: unknown,
  fieldName = 'unit',
): string | null {
  if (unit === undefined || unit === null) {
    return null;
  }

  if (typeof unit !== 'string') {
    throw new InvalidInputError(`${fieldName} must be a string`);
  }

  const base = unit.trim().replace(RATE_SUFFIX_PATTERN, '').trim();

  if (base.length === 0) {
    return null;
  }

  const basis = assertValidDosageBasis(
    dosageBasis,
    `${fieldName} dosageBasis`,
  );

  return basis === 'POR_HECTAREA' ? `${base}/ha` : `${base}/100 L`;
}
