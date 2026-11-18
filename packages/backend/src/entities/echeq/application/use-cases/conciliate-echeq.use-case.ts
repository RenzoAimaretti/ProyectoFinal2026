import { assertEcheqTransition, EcheqStatus } from '../../domain/echeq.rules';
import {
  EntityNotFoundError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import { EcheqRepositoryPort } from '../echeq.ports';
import { EcheqRecord } from '../echeq.types';
import { requiredDate, requiredString } from '../echeq.validation';

export class ConciliateEcheqUseCase {
  constructor(private readonly repository: EcheqRepositoryPort) {}

  async execute(
    companyId: string,
    id: string,
    target: EcheqStatus,
    settlementDate: string,
  ): Promise<EcheqRecord> {
    const company = requiredString(companyId, 'companyId');
    const echeqId = requiredString(id, 'id');
    const row = await this.repository.findByIdForCompany(echeqId, company);
    if (!row)
      throw new EntityNotFoundError(`Echeq with id ${echeqId} not found`);
    // Rejection has its own operation and must never create a settlement date.
    const expected: EcheqStatus =
      row.direction === 'RECIBIDO' ? 'ACREDITADO' : 'DEBITADO';
    const status = assertEcheqTransition(row.status, row.direction, target);
    if (status !== expected) {
      // A request to settle as RECHAZADO is invalid even though rejection is a legal transition.
      throw new InvalidStateTransitionError('Use rejection to reject an eCheq');
    }
    const date = requiredDate(settlementDate, 'settlementDate');
    const updated = await this.repository.changeStatus(
      echeqId,
      company,
      row.status,
      status,
      date,
    );
    if (!updated)
      throw new EntityNotFoundError(`Echeq with id ${echeqId} not found`);
    return updated;
  }
}
