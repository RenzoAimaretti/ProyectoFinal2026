import { DEFAULT_DOSAGE_BASIS } from '../domain/dosage-basis';
import { calculatePrescriptionTotals } from '../domain/spray-calculation';
import { RecipeOutput, RecipeRecord } from './recipe.types';

/**
 * R5: enriches a stored recipe with the computed totals. The calculation needs
 * the lot surface; when it is unknown the record is returned unchanged so the
 * enrichment stays strictly additive (legacy lot-scoped reads keep their shape).
 *
 * The per-item totals are matched to the items by position: the calculation
 * returns its rows in the same order it received them, so an input that appears
 * twice still gets one total per row.
 */
export function withPrescriptionTotals(
  recipe: RecipeRecord,
  lotArea: number | undefined,
): RecipeOutput {
  if (
    typeof lotArea !== 'number' ||
    !Number.isFinite(lotArea) ||
    lotArea <= 0
  ) {
    return recipe;
  }

  const totals = calculatePrescriptionTotals({
    sprayVolume: recipe.sprayVolume,
    lotArea,
    items: recipe.items.map((item) => ({
      inputId: item.inputId,
      dose: item.dose,
      dosageBasis: item.dosageBasis ?? DEFAULT_DOSAGE_BASIS,
    })),
  });

  return {
    ...recipe,
    caldoTotal: totals.caldoTotal,
    items: recipe.items.map((item, index) => ({
      ...item,
      total: totals.items[index]?.total,
      perHectare: totals.items[index]?.perHectare,
      per100L: totals.items[index]?.per100L,
    })),
  };
}
