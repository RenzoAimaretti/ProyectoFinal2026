import type { LaborKind } from '../../labor-type/domain/labor-kind';

/**
 * The four states `doc/vision.md:86` names for a lot on the map, spelled exactly
 * as the requirement spells them.
 */
export const LOT_STATES = ['libre', 'sembrado', 'aplicado', 'cosechado'] as const;

export type LotState = (typeof LOT_STATES)[number];

/** A labour that actually happened on the lot, with the kind the tenant declared. */
export type LotLaborFact = {
  kind: LaborKind;
  occurredAt: Date;
};

/** A recipe loaded for the lot. A recipe is a prescription, not proof of work. */
export type LotRecipeFact = {
  occurredAt: Date;
};

export type LotHistory = {
  labors: readonly LotLaborFact[];
  recipes: readonly LotRecipeFact[];
};

export const EMPTY_LOT_HISTORY: LotHistory = { labors: [], recipes: [] };

const STATE_BY_LABOR_KIND: Partial<Record<LaborKind, LotState>> = {
  SIEMBRA: 'sembrado',
  PULVERIZACION: 'aplicado',
  FERTILIZACION: 'aplicado',
  COSECHA: 'cosechado',
};

/**
 * Seasonal order, used only to break a tie between events that share a timestamp:
 * spraying follows sowing, and a harvest closes the cycle. Without it the answer
 * would depend on the order the rows happened to come back from the database.
 */
const TIE_BREAK_ORDER: Record<LotState, number> = {
  libre: 0,
  sembrado: 1,
  aplicado: 2,
  cosechado: 3,
};

/**
 * The most recent event wins, because that is what the lot looks like now: a sown
 * lot that is later sprayed reads `aplicado`, and a lot sown again after a harvest
 * reads `sembrado`. A labour whose kind is `OTRO` changes nothing rather than
 * guessing, so an unclassified catalogue leaves every lot `libre`.
 */
export function deriveLotState(history: LotHistory): LotState {
  const candidates: Array<{ state: LotState; occurredAt: Date }> = [];

  for (const labor of history.labors) {
    const state = STATE_BY_LABOR_KIND[labor.kind];

    if (state !== undefined) {
      candidates.push({ state, occurredAt: labor.occurredAt });
    }
  }

  for (const recipe of history.recipes) {
    candidates.push({ state: 'aplicado', occurredAt: recipe.occurredAt });
  }

  if (candidates.length === 0) {
    return 'libre';
  }

  return candidates.reduce((best, candidate) =>
    isLater(candidate.state, candidate.occurredAt, best) ? candidate : best,
  ).state;
}

function isLater(
  state: LotState,
  occurredAt: Date,
  latest: { state: LotState; occurredAt: Date },
): boolean {
  const moment = occurredAt.getTime();
  const latestMoment = latest.occurredAt.getTime();

  if (moment !== latestMoment) {
    return moment > latestMoment;
  }

  return TIE_BREAK_ORDER[state] > TIE_BREAK_ORDER[latest.state];
}
