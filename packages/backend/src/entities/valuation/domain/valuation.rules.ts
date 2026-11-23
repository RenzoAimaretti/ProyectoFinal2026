import { Dec } from './decimal';
import { InvalidDecimalError, MarketUnavailableError } from './errors';
import { MarketSnapshot } from './market-snapshot';
import { Grain, MONEY_UNIT, Money, TARIFF_BASIS, TariffBasis } from './money';
import {
  UsdRateType,
  usdRateFor,
  VALUATION_USD_RATE_TYPE,
} from './valuation-rate-policy';

const ARS_DECIMALS = 2;
const ONE_THOUSANDTH = Dec.parse('0.001');
/** Persisted quantities and native amounts are Decimal(18,4). */
const NATIVE_DECIMALS = 4;

/** Resultado en ARS junto con el precio o la tasa que lo produjo. */
export interface ArsConversion {
  ars: Dec;
  grainArsPerTon: Dec | null;
  usdRate: Dec | null;
  usdRateType: UsdRateType | null;
}

/**
 * Convierte un monto a ARS: ARS directo, USD x tasa de la politica, kilos x
 * precio de pizarra por tonelada / 1000. Devuelve `null` si falta el dato de
 * mercado requerido (nunca inventa ni usa 0). Redondea a 2 decimales mitad
 * hacia arriba.
 */
export function convertToArs(
  money: Money,
  market: MarketSnapshot,
  rateType: UsdRateType = VALUATION_USD_RATE_TYPE,
): ArsConversion | null {
  switch (money.unit) {
    case MONEY_UNIT.ARS:
      return {
        ars: money.amount.roundHalfUp(ARS_DECIMALS),
        grainArsPerTon: null,
        usdRate: null,
        usdRateType: null,
      };

    case MONEY_UNIT.USD: {
      const rate = usdRateFor(market, rateType);
      if (!rate) return null;
      return {
        ars: money.amount.mul(rate).roundHalfUp(ARS_DECIMALS),
        grainArsPerTon: null,
        usdRate: rate,
        usdRateType: rateType,
      };
    }

    case MONEY_UNIT.KG_CEREAL: {
      const pricePerTon = money.grain
        ? market.grainArsPerTon[money.grain]
        : null;
      if (!pricePerTon) return null;
      return {
        ars: money.amount
          .mul(pricePerTon)
          .mul(ONE_THOUSANDTH)
          .roundHalfUp(ARS_DECIMALS),
        grainArsPerTon: pricePerTon,
        usdRate: null,
        usdRateType: null,
      };
    }
  }
}

export function toArs(
  money: Money,
  market: MarketSnapshot,
  rateType: UsdRateType = VALUATION_USD_RATE_TYPE,
): Dec | null {
  return convertToArs(money, market, rateType)?.ars ?? null;
}

/**
 * Converts a `Float` column (hectares, hours) into an exact decimal through the
 * number's own decimal string, rounded to the 4 decimals that are persisted.
 * No float arithmetic is ever done on the value.
 */
export function quantityFromNumber(value: number): Dec {
  if (!Number.isFinite(value)) {
    throw new InvalidDecimalError(`Invalid quantity: ${String(value)}`);
  }
  return Dec.parse(String(value)).roundHalfUp(NATIVE_DECIMALS);
}

/** One side (price or cost) of a tariff as applied to a report. */
export interface PricedComponent {
  money: Money;
  basis: TariffBasis;
}

export interface ValuationTariff {
  id: string;
  price: PricedComponent;
  cost: PricedComponent;
}

export interface ValuationReportQuantities {
  hectares: Dec;
  hours: Dec;
}

/** Everything a snapshot stores, as exact decimals. */
export interface ValuationComputation {
  hectares: Dec;
  hours: Dec;
  incomeNative: Dec;
  costNative: Dec;
  incomeArs: Dec;
  costArs: Dec;
  incomeGrainArsPerTon: Dec | null;
  costGrainArsPerTon: Dec | null;
  usdRate: Dec | null;
  usdRateType: UsdRateType | null;
  grainSource: string | null;
  usdSource: string | null;
  priceFetchedAt: Date | null;
  priceStale: boolean;
}

/** The grains and dollar a tariff needs, so only that is asked to the market. */
export function marketNeedOf(tariff: ValuationTariff): {
  grains: Grain[];
  usd: boolean;
} {
  const sides = [tariff.price.money, tariff.cost.money];
  const grains = new Set<Grain>();
  for (const side of sides) {
    if (side.unit === MONEY_UNIT.KG_CEREAL && side.grain) {
      grains.add(side.grain);
    }
  }
  return {
    grains: [...grains],
    usd: sides.some((side) => side.unit === MONEY_UNIT.USD),
  };
}

function nativeAmountOf(
  component: PricedComponent,
  report: ValuationReportQuantities,
): Money {
  const quantity =
    component.basis === TARIFF_BASIS.POR_HECTAREA
      ? report.hectares
      : report.hours;
  return {
    amount: component.money.amount.mul(quantity).roundHalfUp(NATIVE_DECIMALS),
    unit: component.money.unit,
    grain: component.money.grain,
  };
}

/**
 * Values one report against a tariff and a market photo. All or nothing:
 * returns `null` when any required price or rate is missing, never a partial
 * result. Inputs (supplies) are not part of the cost. ARS results are computed
 * from the native amount rounded to its persisted 4 decimals so the snapshot is
 * self-consistent.
 */
export function computeValuation(
  report: ValuationReportQuantities,
  tariff: ValuationTariff,
  market: MarketSnapshot,
  rateType: UsdRateType = VALUATION_USD_RATE_TYPE,
): ValuationComputation | null {
  const incomeNative = nativeAmountOf(tariff.price, report);
  const costNative = nativeAmountOf(tariff.cost, report);

  const income = convertToArs(incomeNative, market, rateType);
  const cost = convertToArs(costNative, market, rateType);
  if (!income || !cost) return null;

  const usedGrain =
    income.grainArsPerTon !== null || cost.grainArsPerTon !== null;
  const usedUsd = income.usdRate !== null || cost.usdRate !== null;
  const fetchedAt = [
    usedGrain ? market.fetchedAt.grains : null,
    usedUsd ? market.fetchedAt.usd : null,
  ].filter((value): value is Date => value !== null);

  return {
    hectares: report.hectares,
    hours: report.hours,
    incomeNative: incomeNative.amount,
    costNative: costNative.amount,
    incomeArs: income.ars,
    costArs: cost.ars,
    incomeGrainArsPerTon: income.grainArsPerTon,
    costGrainArsPerTon: cost.grainArsPerTon,
    usdRate: income.usdRate ?? cost.usdRate,
    usdRateType: income.usdRateType ?? cost.usdRateType,
    grainSource: usedGrain ? market.sources.grains : null,
    usdSource: usedUsd ? market.sources.usd : null,
    priceFetchedAt:
      fetchedAt.length > 0
        ? new Date(Math.min(...fetchedAt.map((date) => date.getTime())))
        : null,
    priceStale:
      (usedGrain && market.stale.grains) || (usedUsd && market.stale.usd),
  };
}

/**
 * "Valor a hoy": re-prices an agreed native amount (kilos or USD) with today's
 * market. ARS passes unchanged (no inflation adjustment). USD uses the rate
 * type of the policy given (the current one), not the one the snapshot used.
 * Throws `MarketUnavailableError` when today's data is missing: never 0.
 */
export function revalueToday(
  native: Money,
  market: MarketSnapshot,
  rateType: UsdRateType = VALUATION_USD_RATE_TYPE,
): Dec {
  const ars = toArs(native, market, rateType);
  if (!ars) {
    throw new MarketUnavailableError(
      native.unit === MONEY_UNIT.KG_CEREAL
        ? `Price not available for ${String(native.grain)}`
        : 'USD quote not available',
    );
  }
  return ars;
}
