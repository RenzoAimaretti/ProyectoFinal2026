export type GrainKey = 'trigo' | 'maiz' | 'girasol' | 'soja' | 'sorgo';

export type GrainPriceRow = {
  grain: GrainKey;
  label: string;
  pricePerTonArs: number | null;
  pricePerTonUsd: number | null;
};

export type PizarraSnapshot = {
  source: 'cac.bcr.com.ar';
  /** Fecha de la pizarra publicada, ISO 8601 (`YYYY-MM-DD`). */
  date: string;
  /** Timestamp publicado por BCR, si está disponible. */
  publishedAt: string | null;
  /** Cotización BNA usada para la conversión a dólares. */
  bnaRate: number | null;
  prices: GrainPriceRow[];
};
