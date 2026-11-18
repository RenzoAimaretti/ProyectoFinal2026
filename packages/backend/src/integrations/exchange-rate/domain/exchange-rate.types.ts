/** Cotización del dólar oficial (Banco Nación) tal como la expone dolarapi.com. */
export type UsdRateSnapshot = {
  source: 'dolarapi.com';
  casa: 'oficial';
  moneda: 'USD';
  nombre: string;
  compra: number;
  venta: number;
  /** ISO 8601 publicado por la fuente. */
  fechaActualizacion: string;
};
