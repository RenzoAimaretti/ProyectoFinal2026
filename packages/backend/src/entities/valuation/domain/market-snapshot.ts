import { Dec } from './decimal';
import { Grain } from './money';

/** Cotizaciones de USD disponibles; la politica decide cual se usa. */
export interface UsdRates {
  oficialVenta: Dec;
  oficialCompra: Dec;
  bnaPizarra: Dec | null;
}

export interface MarketSources {
  grains: string | null;
  usd: string | null;
}

export interface MarketFetchedAt {
  grains: Date | null;
  usd: Date | null;
}

export interface MarketStale {
  grains: boolean;
  usd: boolean;
}

/**
 * Foto de precios de mercado en un instante. Un precio de grano `null` es
 * "S/C" (sin cotizacion); `usd: null` es proveedor no disponible. Un valor
 * `stale` (cache vencido tras fallo del proveedor) se acepta (decision D26) y
 * su estado viaja en `stale` y `fetchedAt`.
 */
export interface MarketSnapshot {
  grainArsPerTon: Partial<Record<Grain, Dec | null>>;
  usd: UsdRates | null;
  sources: MarketSources;
  fetchedAt: MarketFetchedAt;
  stale: MarketStale;
}
