import { Dec } from './decimal';
import { InvalidMoneyError } from './errors';

export const MONEY_UNIT = {
  ARS: 'ARS',
  USD: 'USD',
  KG_CEREAL: 'KG_CEREAL',
} as const;
export type MoneyUnit = (typeof MONEY_UNIT)[keyof typeof MONEY_UNIT];

/** Los cinco granos de la pizarra BCR. */
export const GRAIN = {
  TRIGO: 'TRIGO',
  MAIZ: 'MAIZ',
  GIRASOL: 'GIRASOL',
  SOJA: 'SOJA',
  SORGO: 'SORGO',
} as const;
export type Grain = (typeof GRAIN)[keyof typeof GRAIN];

/** Base por la que se multiplica el importe de una tarifa. */
export const TARIFF_BASIS = {
  POR_HECTAREA: 'POR_HECTAREA',
  POR_HORA: 'POR_HORA',
} as const;
export type TariffBasis = (typeof TARIFF_BASIS)[keyof typeof TARIFF_BASIS];

export interface Money {
  amount: Dec;
  unit: MoneyUnit;
  /** Distinto de null si y solo si `unit` es KG_CEREAL. */
  grain: Grain | null;
}

export function isMoneyUnit(value: unknown): value is MoneyUnit {
  return typeof value === 'string' && value in MONEY_UNIT;
}

export function isGrain(value: unknown): value is Grain {
  return typeof value === 'string' && value in GRAIN;
}

export function isTariffBasis(value: unknown): value is TariffBasis {
  return typeof value === 'string' && value in TARIFF_BASIS;
}

/** Grano obligatorio solo en KG_CEREAL, monto >= 0 (0 es valido). */
export function assertValidMoney(money: Money): void {
  if (money.amount.isNegative()) {
    throw new InvalidMoneyError('El monto no puede ser negativo');
  }

  if (money.unit === MONEY_UNIT.KG_CEREAL && money.grain === null) {
    throw new InvalidMoneyError(
      'El grano es obligatorio cuando la moneda es kilos de cereal',
    );
  }

  if (money.unit !== MONEY_UNIT.KG_CEREAL && money.grain !== null) {
    throw new InvalidMoneyError(
      'El grano solo se admite cuando la moneda es kilos de cereal',
    );
  }
}
