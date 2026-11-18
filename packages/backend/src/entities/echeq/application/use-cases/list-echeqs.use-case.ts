import { EcheqStatus, isEcheqStatus } from '../../domain/echeq.rules';
import { InvalidInputError } from '../../domain/errors';
import { EcheqRepositoryPort } from '../echeq.ports';
import { EcheqRecord } from '../echeq.types';
import { requiredString } from '../echeq.validation';

export class ListEcheqsUseCase {
  constructor(private readonly repository: EcheqRepositoryPort) {}

  execute(companyId: string, status?: EcheqStatus): Promise<EcheqRecord[]> {
    const company = requiredString(companyId, 'companyId');
    if (status !== undefined && !isEcheqStatus(status))
      throw new InvalidInputError('status must be a valid eCheq status');
    return this.repository.findAllByCompany(company, status);
  }
}
