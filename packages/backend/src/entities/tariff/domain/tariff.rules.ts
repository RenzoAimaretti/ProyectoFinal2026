import { Dec } from '../../valuation/domain/decimal';
import {
  InvalidDecimalError,
  InvalidMoneyError,
} from '../../valuation/domain/errors';
import {
  Money,
  TariffBasis,
  assertValidMoney,
  isGrain,
  isMoneyUnit,
  isTariffBasis,
} from '../../valuation/domain/money';
import { InvalidInputError } from './errors';

export interface TariffComponent {
  money: Money;
  basis: TariffBasis;
}

export interface TariffValues {
  price: TariffComponent;
  cost: TariffComponent;
}

/** Decimal(18,4): hasta 14 digitos enteros y 4 decimales. */
const MAX_AMOUNT = Dec.parse('99999999999999.9999');
const MAX_DECIMALS = 4;

function parseAmount(raw: unknown, label: string): Dec {
  const text =
    typeof raw === 'string'
      ? raw.trim()
      : typeof raw === 'number' && Number.isFinite(raw)
        ? String(raw)
        : null;

  if (text === null || text === '') {
    throw new InvalidInputError(`El importe del ${label} es obligatorio`);
  }

  // Sin notacion exponencial: el importe llega como decimal simple.
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new InvalidInputError(
      `El importe del ${label} no es un número válido`,
    );
  }

  let amount: Dec;
  try {
    amount = Dec.parse(text);
  } catch (error) {
    if (error instanceof InvalidDecimalError) {
      throw new InvalidInputError(
        `El importe del ${label} no es un número válido`,
      );
    }
    throw error;
  }

  if (amount.roundHalfUp(MAX_DECIMALS).cmp(amount) !== 0) {
    throw new InvalidInputError(
      `El importe del ${label} admite hasta ${MAX_DECIMALS} decimales`,
    );
  }

  if (amount.cmp(MAX_AMOUNT) > 0) {
    throw new InvalidInputError(`El importe del ${label} es demasiado grande`);
  }

  return amount;
}

function parseComponent(raw: unknown, label: string): TariffComponent {
  if (typeof raw !== 'object' || raw === null) {
    throw new InvalidInputError(`El ${label} es obligatorio`);
  }

  const input = raw as Record<string, unknown>;
  const amount = parseAmount(input.amount, label);

  if (!isMoneyUnit(input.unit)) {
    throw new InvalidInputError(
      `La moneda del ${label} debe ser ARS, USD o KG_CEREAL`,
    );
  }

  const grain = input.grain ?? null;
  if (grain !== null && !isGrain(grain)) {
    throw new InvalidInputError(`El grano del ${label} no es válido`);
  }

  if (!isTariffBasis(input.basis)) {
    throw new InvalidInputError(
      `La base del ${label} debe ser POR_HECTAREA o POR_HORA`,
    );
  }

  const money: Money = { amount, unit: input.unit, grain };
  try {
    assertValidMoney(money);
  } catch (error) {
    if (error instanceof InvalidMoneyError) {
      throw new InvalidInputError(`${error.message} (${label})`);
    }
    throw error;
  }

  return { money, basis: input.basis };
}

/**
 * Valida precio y costo estandar de una tarifa. Ambos son obligatorios (0 es
 * valido), cada uno con su propia base y moneda.
 */
export function parseTariffValues(raw: {
  price?: unknown;
  cost?: unknown;
}): TariffValues {
  return {
    price: parseComponent(raw.price, 'precio'),
    cost: parseComponent(raw.cost, 'costo estándar'),
  };
}
