import { DOSAGE_BASIS_VALUES, DosageBasisValue } from './dosage-basis';
import {
  InvalidInputError,
  InvalidRelationError,
  PrescriptionFrozenError,
} from './errors';

/**
 * Minimum data a recipe item needs so its loading order can be resolved
 * deterministically.
 */
export type RecipeItemOrdering = {
  inputId: string;
  loadOrder: number;
};

/**
 * R009: a recipe always carries explicitly unit-bearing magnitudes. A value
 * that is missing, non finite or not strictly positive cannot instruct a
 * preparation.
 */
function assertPositiveFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new InvalidInputError(
      `${fieldName} must be a finite number greater than 0`,
    );
  }

  return value;
}

/**
 * R009: a recipe instructs the preparation of an input, so the dose must be
 * applicable. Zero, negative and non finite doses cannot be prepared.
 */
export function assertValidDose(dose: unknown, fieldName = 'dose'): number {
  return assertPositiveFiniteNumber(dose, fieldName);
}

/**
 * R009: the recipe declares the spray volume (volumen de caldo) that prepares
 * the mix, so it must be finite and strictly positive.
 */
export function assertValidSprayVolume(
  sprayVolume: unknown,
  fieldName = 'sprayVolume',
): number {
  return assertPositiveFiniteNumber(sprayVolume, fieldName);
}

/**
 * R009: the contractor adds products to the mix following the loading order,
 * so it must be a whole number starting at 1.
 */
export function assertValidLoadOrder(
  loadOrder: unknown,
  fieldName = 'loadOrder',
): number {
  if (
    typeof loadOrder !== 'number' ||
    !Number.isInteger(loadOrder) ||
    loadOrder < 1
  ) {
    throw new InvalidInputError(
      `${fieldName} must be an integer greater than or equal to 1`,
    );
  }

  return loadOrder;
}

/**
 * R009: a recipe without items carries no doses, so it cannot instruct a
 * preparation.
 */
export function assertRecipeHasItems(items: ReadonlyArray<unknown>): void {
  if (items.length === 0) {
    throw new InvalidInputError(
      'A recipe must include at least one item with a dose and loading order',
    );
  }
}

/**
 * R009: two products cannot occupy the same position in the loading sequence,
 * otherwise the preparation instruction is ambiguous.
 */
export function assertDistinctLoadOrders(
  items: ReadonlyArray<{ loadOrder: number }>,
): void {
  const seen = new Set<number>();

  for (const { loadOrder } of items) {
    if (seen.has(loadOrder)) {
      throw new InvalidInputError(
        `Duplicate loadOrder ${loadOrder} in recipe items`,
      );
    }

    seen.add(loadOrder);
  }
}

/**
 * R009: loading order must be deterministic for the same recipe, so items are
 * always resolved by ascending loadOrder with inputId as stable tie breaker.
 */
export function orderRecipeItemsByLoadOrder<T extends RecipeItemOrdering>(
  items: ReadonlyArray<T>,
): T[] {
  return [...items].sort(
    (left, right) =>
      left.loadOrder - right.loadOrder ||
      left.inputId.localeCompare(right.inputId),
  );
}

/**
 * R4/R5: the spray volume is applied over the lot surface, so the lot must
 * expose a finite area strictly greater than zero to compute a caldo total.
 */
export function assertValidLotArea(
  value: unknown,
  fieldName = 'lotArea',
): number {
  return assertPositiveFiniteNumber(value, fieldName);
}

/**
 * R4: each item declares whether its dose is per hectare or a concentration,
 * so the basis must be one of the two supported values.
 */
export function assertValidDosageBasis(
  value: unknown,
  fieldName = 'dosageBasis',
): DosageBasisValue {
  if (
    typeof value !== 'string' ||
    !(DOSAGE_BASIS_VALUES as ReadonlyArray<string>).includes(value)
  ) {
    throw new InvalidInputError(
      `${fieldName} must be one of ${DOSAGE_BASIS_VALUES.join(', ')}`,
    );
  }

  return value as DosageBasisValue;
}

/**
 * Decision 14: the derived per-hectare and per-100 L amounts are shown to the
 * contractor, so a value that overflowed to `Infinity` or decayed to `NaN`
 * cannot be published as a real quantity.
 */
export function assertFiniteDerivedValue(
  value: unknown,
  fieldName: string,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidInputError(`${fieldName} must be a finite number`);
  }

  return value;
}

/**
 * R4: maximum length accepted for the optional pest and crop labels, so a
 * free-text field cannot store an unbounded value.
 */
export const RECIPE_TEXT_MAX_LENGTH = 120;

/**
 * R4: pest and crop are optional free text. When provided they must be a
 * non-empty trimmed string of at most {@link RECIPE_TEXT_MAX_LENGTH}
 * characters; a blank string is treated as absent, matching the existing
 * optional string convention.
 */
export function assertOptionalRecipeText(
  value: unknown,
  fieldName: string,
  maxLength = RECIPE_TEXT_MAX_LENGTH,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new InvalidInputError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > maxLength) {
    throw new InvalidInputError(
      `${fieldName} must not be longer than ${maxLength} characters`,
    );
  }

  return trimmed;
}

/**
 * R010: the re-application interval is expressed in whole days, so it must be a
 * positive integer when provided.
 */
export function assertValidReapplicationIntervalDays(
  value: unknown,
  fieldName = 'reapplicationIntervalDays',
): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new InvalidInputError(
      `${fieldName} must be an integer greater than or equal to 1`,
    );
  }

  return value;
}

/**
 * R010: a re-application date must be strictly after the prescription date so
 * the plan always describes a future application.
 */
export function assertValidReapplicationDate(
  value: unknown,
  prescriptionDate: Date,
  fieldName = 'reapplicationDate',
): Date | null {
  if (value === undefined || value === null) {
    return null;
  }

  const date = toDomainDate(value);

  if (!date) {
    throw new InvalidInputError(`${fieldName} must be a valid date`);
  }

  if (date.getTime() <= prescriptionDate.getTime()) {
    throw new InvalidInputError(
      `${fieldName} must be strictly after the prescription date`,
    );
  }

  return date;
}

function toDomainDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * R010: the re-application plan is entirely optional. The interval on its own
 * is a valid plan, as is the date on its own or both together.
 */
export function assertValidReapplicationPlan(
  plan: {
    reapplicationIntervalDays?: unknown;
    reapplicationDate?: unknown;
  },
  prescriptionDate: Date,
): { intervalDays: number | null; date: Date | null } {
  return {
    intervalDays: assertValidReapplicationIntervalDays(
      plan?.reapplicationIntervalDays,
    ),
    date: assertValidReapplicationDate(
      plan?.reapplicationDate,
      prescriptionDate,
    ),
  };
}

/**
 * R4: the prescription is written for the lot the task runs on, so the
 * redundant `Recipe.lotId` must stay equal to `Task.lotId`.
 */
export function assertPrescriptionLotMatchesTask(
  prescriptionLotId: string,
  taskLotId: string,
): void {
  if (prescriptionLotId !== taskLotId) {
    throw new InvalidRelationError(
      'Recipe lot must match the lot of the task it belongs to',
    );
  }
}

/**
 * Task lifecycle states, mirroring `TaskStatusValue` from the task module. Only
 * the started states matter to the prescription lifecycle.
 */
export type PrescriptionTaskStatus =
  | 'PENDIENTE'
  | 'EN_PROGRESO'
  | 'FINALIZADA'
  | 'CANCELADA';

/**
 * R7: once the task reached EN_PROGRESO or FINALIZADA the prescription is
 * frozen. PENDIENTE and CANCELADA keep it editable.
 */
export const FROZEN_TASK_STATUSES: ReadonlyArray<PrescriptionTaskStatus> = [
  'EN_PROGRESO',
  'FINALIZADA',
];

/**
 * R7: a prescription is editable only while its task has not started.
 */
export function assertPrescriptionEditable(task: {
  status: PrescriptionTaskStatus;
}): void {
  if (FROZEN_TASK_STATUSES.includes(task.status)) {
    throw new PrescriptionFrozenError(
      `The prescription cannot be edited because its task is ${task.status}`,
    );
  }
}
