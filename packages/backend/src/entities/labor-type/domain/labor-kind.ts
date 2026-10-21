import { InvalidInputError } from './errors';

/**
 * The semantic class of a labour, which is deliberately not its display name: a
 * tenant may rename "Siembra" to anything it likes, and the meaning has to
 * survive the rename. `OTRO` means the labour is not classified, and the lot
 * state derivation has to treat it as such rather than guess.
 */
export const LABOR_KINDS = [
  'SIEMBRA',
  'PULVERIZACION',
  'FERTILIZACION',
  'COSECHA',
  'OTRO',
] as const;

export type LaborKind = (typeof LABOR_KINDS)[number];

export const DEFAULT_LABOR_KIND: LaborKind = 'OTRO';

export function assertLaborKind(value: unknown): LaborKind {
  if (LABOR_KINDS.includes(value as LaborKind)) {
    return value as LaborKind;
  }

  throw new InvalidInputError(
    `kind must be one of ${LABOR_KINDS.join(', ')}`,
  );
}
