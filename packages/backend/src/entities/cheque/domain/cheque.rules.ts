import { ChequeStatus, isChequeStatus } from './cheque-status';
import { InvalidInputError, InvalidStateTransitionError } from './errors';

const nextStatuses: Record<ChequeStatus, readonly ChequeStatus[]> = {
  EN_CARTERA: ['DEPOSITADO', 'ENDOSADO', 'RECHAZADO'],
  DEPOSITADO: ['COBRADO', 'RECHAZADO'],
  COBRADO: [],
  RECHAZADO: [],
  ENDOSADO: [],
};

export function assertChequeTransition(
  from: ChequeStatus,
  to: unknown,
): ChequeStatus {
  if (!isChequeStatus(to)) {
    throw new InvalidInputError('status must be a valid cheque status');
  }
  if (!nextStatuses[from].includes(to)) {
    throw new InvalidStateTransitionError(
      `A cheque in status ${from} cannot transition to ${to}`,
    );
  }
  return to;
}
