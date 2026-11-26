import { assertEcheqTransition } from '../../domain/echeq.rules';
import { EntityNotFoundError } from '../../domain/errors';
import { EcheqRepositoryPort } from '../echeq.ports';
import { EcheqRecord } from '../echeq.types';
import { requiredString } from '../echeq.validation';

export class RejectEcheqUseCase {
  constructor(private readonly repository: EcheqRepositoryPort) {}

  async execute(
    companyId: string,
    id: string,
    notes?: string | null,
  ): Promise<EcheqRecord> {
    const company = requiredString(companyId, 'companyId');
    const echeqId = requiredString(id, 'id');
    const row = await this.repository.findByIdForCompany(echeqId, company);
    if (!row)
      throw new EntityNotFoundError(`Echeq with id ${echeqId} not found`);
    const status = assertEcheqTransition(
      row.status,
      row.direction,
      'RECHAZADO',
    );
    const updated = await this.repository.changeStatus(
      echeqId,
      company,
      row.status,
      status,
      null,
      notes ?? undefined,
    );
    if (!updated)
      throw new EntityNotFoundError(`Echeq with id ${echeqId} not found`);
    return updated;
  }
}
