import { InvalidInputError, InvalidStateTransitionError } from './errors';

export const ECHEQ_STATUSES = [
  'PENDIENTE',
  'ACREDITADO',
  'DEBITADO',
  'RECHAZADO',
] as const;
export type EcheqStatus = (typeof ECHEQ_STATUSES)[number];
export const ECHEQ_DIRECTIONS = ['EMITIDO', 'RECIBIDO'] as const;
export type EcheqDirection = (typeof ECHEQ_DIRECTIONS)[number];

export function isEcheqStatus(value: unknown): value is EcheqStatus {
  return ECHEQ_STATUSES.some((status) => status === value);
}

export function isEcheqDirection(value: unknown): value is EcheqDirection {
  return ECHEQ_DIRECTIONS.some((direction) => direction === value);
}

export function assertEcheqTransition(
  from: EcheqStatus,
  direction: EcheqDirection,
  target: unknown,
): EcheqStatus {
  if (!isEcheqStatus(target))
    throw new InvalidInputError('status must be a valid eCheq status');
  if (
    from !== 'PENDIENTE' ||
    (target !== 'RECHAZADO' &&
      target !== (direction === 'RECIBIDO' ? 'ACREDITADO' : 'DEBITADO'))
  ) {
    throw new InvalidStateTransitionError(
      `An eCheq in status ${from} with direction ${direction} cannot transition to ${target}`,
    );
  }
  return target;
}
