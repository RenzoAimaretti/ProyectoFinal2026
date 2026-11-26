import { ChequeStatus, isChequeStatus } from '../../domain/cheque-status';
import { InvalidInputError } from '../../domain/errors';
import { ChequeRepositoryPort } from '../cheque.ports';
import { ChequeRecord } from '../cheque.types';
import { requiredString } from '../cheque.validation';

export class ListChequesUseCase {
  constructor(private readonly repository: ChequeRepositoryPort) {}

  async execute(
    companyId: string,
    status?: ChequeStatus,
  ): Promise<ChequeRecord[]> {
    const company = requiredString(companyId, 'companyId');
    if (status !== undefined && !isChequeStatus(status)) {
      throw new InvalidInputError('status must be a valid cheque status');
    }
    return await this.repository.findAllByCompany(company, status);
  }
}
