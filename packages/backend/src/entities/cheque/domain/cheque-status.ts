export const CHEQUE_STATUSES = [
  'EN_CARTERA',
  'DEPOSITADO',
  'COBRADO',
  'RECHAZADO',
  'ENDOSADO',
] as const;

export type ChequeStatus = (typeof CHEQUE_STATUSES)[number];
export const CHEQUE_INITIAL_STATUS: ChequeStatus = 'EN_CARTERA';

export function isChequeStatus(value: unknown): value is ChequeStatus {
  return CHEQUE_STATUSES.some((status) => status === value);
}
