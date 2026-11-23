import { Dec } from './decimal';
import { MarketSnapshot } from './market-snapshot';
import { MONEY_UNIT, Money } from './money';
import {
  UsdRateType,
  usdRateFor,
  VALUATION_USD_RATE_TYPE,
} from './valuation-rate-policy';

const ARS_DECIMALS = 2;
const ONE_THOUSANDTH = Dec.parse('0.001');

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
