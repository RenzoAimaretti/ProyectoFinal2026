export type InputUnit = 'L' | 'KG' | 'UNIT';

/**
 * Locked, evidence-based vocabulary: exactly the three denominations the mobile
 * unit dropdown offers and the seeds use. Do not add speculative members; an
 * unknown value must be rejected, never mapped.
 */
export const INPUT_UNITS: readonly InputUnit[] = ['L', 'KG', 'UNIT'];

export function isInputUnit(value: unknown): value is InputUnit {
  return (
    typeof value === 'string' &&
    (INPUT_UNITS as readonly string[]).includes(value)
  );
}
