import { EntityNotFoundError } from '../../domain/errors';
import { ChequeRepositoryPort } from '../cheque.ports';
import { ChequeRecord } from '../cheque.types';
import { requiredString } from '../cheque.validation';

export class FindChequeUseCase {
  constructor(private readonly repository: ChequeRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<ChequeRecord> {
    const chequeId = requiredString(id, 'id');
    const company = requiredString(companyId, 'companyId');
    const cheque = await this.repository.findByIdForCompany(chequeId, company);
    if (!cheque)
      throw new EntityNotFoundError(`Cheque with id ${chequeId} not found`);
    return cheque;
  }
}
