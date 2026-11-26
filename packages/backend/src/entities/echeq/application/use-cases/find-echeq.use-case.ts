import { EntityNotFoundError } from '../../domain/errors';
import { EcheqRepositoryPort } from '../echeq.ports';
import { EcheqRecord } from '../echeq.types';
import { requiredString } from '../echeq.validation';

export class FindEcheqUseCase {
  constructor(private readonly repository: EcheqRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<EcheqRecord> {
    const echeqId = requiredString(id, 'id');
    const company = requiredString(companyId, 'companyId');
    const row = await this.repository.findByIdForCompany(echeqId, company);
    if (!row)
      throw new EntityNotFoundError(`Echeq with id ${echeqId} not found`);
    return row;
  }
}
