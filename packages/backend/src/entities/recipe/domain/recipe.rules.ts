import { InvalidInputError } from './errors';

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
