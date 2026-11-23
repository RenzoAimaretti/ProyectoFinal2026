import { Grain, MoneyUnit, TariffBasis } from '../../../valuation/domain/money';

/** Importe, moneda, grano y base de uno de los dos lados de una tarifa. */
export interface TariffComponentOutput {
  /** Decimal como string (nunca number). */
  amount: string;
  unit: MoneyUnit;
  grain: Grain | null;
  basis: TariffBasis;
}

export interface TariffOutput {
  id: string;
  laborTypeId: string;
  price: TariffComponentOutput;
  cost: TariffComponentOutput;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Equivalente en kilos del grano elegido; `null` si no hay dato de mercado. */
export interface TariffKgEquivalentOutput {
  tariffId: string;
  laborTypeId: string;
  priceKg: string | null;
  costKg: string | null;
}

export interface TariffKgEquivalentsOutput {
  grain: Grain;
  /** ARS por tonelada del grano elegido; `null` si no hay precio ("S/C"). */
  grainArsPerTon: string | null;
  calculatedAt: Date;
  items: TariffKgEquivalentOutput[];
}
