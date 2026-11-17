export const DOSAGE_BASIS_VALUES = ['POR_HECTAREA', 'CONCENTRACION'] as const;

export type DosageBasisValue = (typeof DOSAGE_BASIS_VALUES)[number];

/**
 * A dose expressed per hectare is the historical behaviour of the recipe
 * editor, so it stays the default when the agronomist does not choose a basis.
 */
export const DEFAULT_DOSAGE_BASIS: DosageBasisValue = 'POR_HECTAREA';
