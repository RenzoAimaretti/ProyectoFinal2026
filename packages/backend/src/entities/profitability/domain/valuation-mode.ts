import { InvalidInputError } from './errors';

export const VALUATION_MODE = {
  /** Snapshot taken when the report was approved or the expense was loaded. */
  AL_APROBAR: 'AL_APROBAR',
  /** Agreed kilos and USD re-priced with today's market. */
  A_VALOR_HOY: 'A_VALOR_HOY',
} as const;
export type ValuationMode =
  (typeof VALUATION_MODE)[keyof typeof VALUATION_MODE];

/** A missing mode is the snapshot; anything else unknown is a 400. */
export function parseValuationMode(value: string | undefined): ValuationMode {
  if (value === undefined) return VALUATION_MODE.AL_APROBAR;
  if (value === VALUATION_MODE.AL_APROBAR) return VALUATION_MODE.AL_APROBAR;
  if (value === VALUATION_MODE.A_VALOR_HOY) return VALUATION_MODE.A_VALOR_HOY;
  throw new InvalidInputError(
    `Modo inválido: "${value}" (AL_APROBAR o A_VALOR_HOY)`,
  );
}
