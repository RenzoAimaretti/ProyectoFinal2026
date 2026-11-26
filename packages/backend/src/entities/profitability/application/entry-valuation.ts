import { Dec } from '../../valuation/domain/decimal';
import { MarketSnapshot } from '../../valuation/domain/market-snapshot';
import { Grain, MONEY_UNIT, Money } from '../../valuation/domain/money';
import { VALUATION_USD_RATE_TYPE } from '../../valuation/domain/valuation-rate-policy';
import { revalueToday } from '../../valuation/domain/valuation.rules';
import { VALUATION_MODE, ValuationMode } from '../domain/valuation-mode';
import { MarketSnapshotPort } from './ports/market-snapshot.port';
import { ValuationInfoOutput } from './dto/profitability.output';

/** An amount to value: the agreed native amount plus its ARS at approval. */
export interface ValuableAmount {
  native: Money;
  arsAtApproval: Dec;
}

export interface ValuedAmounts {
  /** ARS per amount, aligned with the input and rounded to cents. */
  ars: Dec[];
  valuation: ValuationInfoOutput;
}

const NO_VALUATION: ValuationInfoOutput = {
  usdRateType: null,
  priceDate: null,
};

/**
 * `AL_APROBAR` keeps the stored ARS. `A_VALOR_HOY` keeps ARS amounts untouched
 * (no inflation adjustment) and re-prices kilos and USD with ONE market photo,
 * the USD with the CURRENT rate policy (D28). A price that is missing for any
 * component raises `MarketUnavailableError`: values are never mixed.
 */
export async function valueAmounts(
  amounts: ValuableAmount[],
  mode: ValuationMode,
  market: MarketSnapshotPort,
): Promise<ValuedAmounts> {
  if (mode === VALUATION_MODE.AL_APROBAR) {
    return {
      ars: amounts.map((amount) => amount.arsAtApproval.roundHalfUp(2)),
      valuation: NO_VALUATION,
    };
  }

  const grains = new Set<Grain>();
  let usd = false;
  for (const { native } of amounts) {
    if (native.unit === MONEY_UNIT.KG_CEREAL && native.grain) {
      grains.add(native.grain);
    }
    if (native.unit === MONEY_UNIT.USD) usd = true;
  }

  // Nothing to re-price (all ARS): no market call, so no 503 either.
  if (grains.size === 0 && !usd) {
    return {
      ars: amounts.map((amount) => amount.arsAtApproval.roundHalfUp(2)),
      valuation: NO_VALUATION,
    };
  }

  const snapshot = await market.getSnapshot({ grains: [...grains], usd });
  const ars = amounts.map((amount) =>
    amount.native.unit === MONEY_UNIT.ARS
      ? amount.arsAtApproval.roundHalfUp(2)
      : revalueToday(amount.native, snapshot, VALUATION_USD_RATE_TYPE),
  );

  return { ars, valuation: valuationInfoOf(snapshot, grains.size > 0, usd) };
}

function valuationInfoOf(
  snapshot: MarketSnapshot,
  usedGrains: boolean,
  usedUsd: boolean,
): ValuationInfoOutput {
  const fetched = [
    usedGrains ? snapshot.fetchedAt.grains : null,
    usedUsd ? snapshot.fetchedAt.usd : null,
  ].filter((value): value is Date => value !== null);

  return {
    usdRateType: usedUsd ? VALUATION_USD_RATE_TYPE : null,
    priceDate:
      fetched.length > 0
        ? new Date(Math.min(...fetched.map((d) => d.getTime()))).toISOString()
        : null,
  };
}
