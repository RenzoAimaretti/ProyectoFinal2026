import { DosageBasisValue } from './dosage-basis';
import {
  assertValidDose,
  assertValidDosageBasis,
  assertValidLotArea,
  assertValidSprayVolume,
} from './recipe.rules';

/**
 * A single prescription row as the calculation needs it: the input, its dose
 * and the basis that dose is expressed in.
 */
export type SprayCalculationItem = {
  inputId: string;
  dose: number;
  dosageBasis: DosageBasisValue;
};

/**
 * Everything the calculation needs from a prescription and its lot. `items` is
 * read only: the calculation never mutates its input.
 */
export type SprayCalculationInput = {
  sprayVolume: number;
  lotArea: number;
  items: ReadonlyArray<SprayCalculationItem>;
};

/**
 * Total amount of one product to load, in the row's own unit.
 */
export type PrescriptionItemTotals = {
  inputId: string;
  total: number;
};

/**
 * R5: what the editor and the server show for a prescription. `caldoTotal` is
 * the total spray volume in litres and `items` carries the total amount of each
 * product, both rounded to two decimals.
 */
export type PrescriptionTotals = {
  caldoTotal: number;
  items: PrescriptionItemTotals[];
};

/**
 * R5: totals are shown to two decimals, so every result is rounded the same way
 * to keep the editor and the server in agreement.
 */
export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * R5: computes the total spray volume (caldo) for the lot and the total amount
 * of every product. The caldo is `sprayVolume * lotArea`; a POR_HECTAREA row is
 * `dose * lotArea` and a CONCENTRACION row is `dose * caldo / 100` (the dose is
 * the amount per 100 L of water, so a 1% v/v mix is entered as `1`). Row totals
 * use the exact caldo, before rounding, to avoid compounding the rounding
 * error. The function is pure and never mutates its input.
 */
export function calculatePrescriptionTotals(
  input: SprayCalculationInput,
): PrescriptionTotals {
  const sprayVolume = assertValidSprayVolume(input.sprayVolume);
  const lotArea = assertValidLotArea(input.lotArea);
  const caldoTotal = sprayVolume * lotArea;

  const items = input.items.map((item, index) => {
    const dose = assertValidDose(item.dose, `items[${index}].dose`);
    const dosageBasis = assertValidDosageBasis(
      item.dosageBasis,
      `items[${index}].dosageBasis`,
    );

    const total =
      dosageBasis === 'POR_HECTAREA'
        ? dose * lotArea
        : (dose * caldoTotal) / 100;

    return { inputId: item.inputId, total: roundTo2(total) };
  });

  return { caldoTotal: roundTo2(caldoTotal), items };
}
