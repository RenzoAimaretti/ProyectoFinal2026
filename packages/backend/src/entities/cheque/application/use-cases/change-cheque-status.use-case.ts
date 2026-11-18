import { assertChequeTransition } from '../../domain/cheque.rules';
import { ChequeStatus } from '../../domain/cheque-status';
import { EntityNotFoundError } from '../../domain/errors';
import { ChequeRepositoryPort } from '../cheque.ports';
import { ChequeRecord } from '../cheque.types';
import { requiredString } from '../cheque.validation';

export class ChangeChequeStatusUseCase {
  constructor(private readonly repository: ChequeRepositoryPort) {}

  async execute(
    companyId: string,
    id: string,
    target: ChequeStatus,
  ): Promise<ChequeRecord> {
    const company = requiredString(companyId, 'companyId');
    const chequeId = requiredString(id, 'id');
    const cheque = await this.repository.findByIdForCompany(chequeId, company);
    if (!cheque)
      throw new EntityNotFoundError(`Cheque with id ${chequeId} not found`);
    const status = assertChequeTransition(cheque.status, target);
    const updated = await this.repository.changeStatus(
      chequeId,
      company,
      cheque.status,
      status,
    );
    if (!updated)
      throw new EntityNotFoundError(`Cheque with id ${chequeId} not found`);
    return updated;
  }
}
