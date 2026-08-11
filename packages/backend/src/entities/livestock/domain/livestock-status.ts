export const LIVESTOCK_STATUSES = [
  'ACTIVO',
  'VENDIDO',
  'MUERTO',
  'ENFERMO',
] as const;

export type LivestockStatus = (typeof LIVESTOCK_STATUSES)[number];
