import { Dec } from './decimal';
import { MarketSnapshot } from './market-snapshot';

export const USD_RATE_TYPE = {
  OFICIAL_VENTA: 'OFICIAL_VENTA',
  OFICIAL_COMPRA: 'OFICIAL_COMPRA',
  BNA_PIZARRA: 'BNA_PIZARRA',
} as const;
export type UsdRateType = (typeof USD_RATE_TYPE)[keyof typeof USD_RATE_TYPE];

/**
 * Politica unica de tasa USD (decision D5, usuario: "Vamos a dejarlo como
 * oficial venta, pero dejalo antoanto porque esto si puede ser que se tenga
 * que modificar"). Este es el UNICO lugar donde se elige el tipo de tasa:
 * cambiarla es cambiar esta constante.
 */
export const VALUATION_USD_RATE_TYPE: UsdRateType = USD_RATE_TYPE.OFICIAL_VENTA;

/** Lee del mercado la cotizacion que corresponde al tipo de tasa de la politica. */
export function usdRateFor(
  market: MarketSnapshot,
  rateType: UsdRateType = VALUATION_USD_RATE_TYPE,
): Dec | null {
  if (!market.usd) return null;

  switch (rateType) {
    case USD_RATE_TYPE.OFICIAL_VENTA:
      return market.usd.oficialVenta;
    case USD_RATE_TYPE.OFICIAL_COMPRA:
      return market.usd.oficialCompra;
    case USD_RATE_TYPE.BNA_PIZARRA:
      return market.usd.bnaPizarra;
  }
}
