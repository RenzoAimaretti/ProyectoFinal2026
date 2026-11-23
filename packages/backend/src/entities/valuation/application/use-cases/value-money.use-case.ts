import { Dec } from '../../domain/decimal';
import { MarketUnavailableError } from '../../domain/errors';
import { MarketSnapshot } from '../../domain/market-snapshot';
import {
  Grain,
  MONEY_UNIT,
  Money,
  MoneyUnit,
  assertValidMoney,
} from '../../domain/money';
import {
  UsdRateType,
  VALUATION_USD_RATE_TYPE,
} from '../../domain/valuation-rate-policy';
import { convertToArs } from '../../domain/valuation.rules';
import { MarketNeed, MarketPricePort } from '../ports/market-price.port';

const EMPTY_MARKET: MarketSnapshot = {
  grainArsPerTon: {},
  usd: null,
  sources: { grains: null, usd: null },
  fetchedAt: { grains: null, usd: null },
  stale: { grains: false, usd: false },
};

export interface ValueMoneyInput {
  /** Decimal como string. */
  amount: string;
  unit: MoneyUnit;
  grain: Grain | null;
}

export interface ValuedMoneyOutput {
  amountArs: string;
  grainArsPerTon: string | null;
  usdRate: string | null;
  usdRateType: UsdRateType | null;
  grainSource: string | null;
  usdSource: string | null;
  priceFetchedAt: Date | null;
  priceStale: boolean;
}

/**
 * Convierte un monto suelto a ARS y devuelve el precio o la tasa usados, su
 * fuente y su frescura. Falla con `MarketUnavailableError` si falta el dato.
 */
export class ValueMoneyUseCase {
  constructor(
    private readonly market: MarketPricePort,
    private readonly rateType: UsdRateType = VALUATION_USD_RATE_TYPE,
  ) {}

  async execute(input: ValueMoneyInput): Promise<ValuedMoneyOutput> {
    const money: Money = {
      amount: Dec.parse(input.amount),
      unit: input.unit,
      grain: input.grain,
    };
    assertValidMoney(money);

    const need = this.needOf(money);
    // ARS no necesita mercado: no se consulta a los proveedores.
    const snapshot =
      need.usd || need.grains.length > 0
        ? await this.market.getSnapshot(need)
        : EMPTY_MARKET;

    const conversion = convertToArs(money, snapshot, this.rateType);
    if (!conversion) {
      throw new MarketUnavailableError(this.unavailableMessage(money));
    }

    const usedGrain = conversion.grainArsPerTon !== null;
    const usedUsd = conversion.usdRate !== null;
    const fetchedAt = [
      usedGrain ? snapshot.fetchedAt.grains : null,
      usedUsd ? snapshot.fetchedAt.usd : null,
    ].filter((value): value is Date => value !== null);

    return {
      amountArs: conversion.ars.toString(),
      grainArsPerTon: conversion.grainArsPerTon?.toString() ?? null,
      usdRate: conversion.usdRate?.toString() ?? null,
      usdRateType: conversion.usdRateType,
      grainSource: usedGrain ? snapshot.sources.grains : null,
      usdSource: usedUsd ? snapshot.sources.usd : null,
      priceFetchedAt:
        fetchedAt.length > 0
          ? new Date(Math.min(...fetchedAt.map((date) => date.getTime())))
          : null,
      priceStale:
        (usedGrain && snapshot.stale.grains) || (usedUsd && snapshot.stale.usd),
    };
  }

  private needOf(money: Money): MarketNeed {
    return {
      grains:
        money.unit === MONEY_UNIT.KG_CEREAL && money.grain ? [money.grain] : [],
      usd: money.unit === MONEY_UNIT.USD,
      usdRateType: this.rateType,
    };
  }

  private unavailableMessage(money: Money): string {
    if (money.unit === MONEY_UNIT.KG_CEREAL) {
      return `Precio no disponible para ${money.grain}`;
    }
    return 'Cotización del dólar no disponible';
  }
}
