import { EcheqClockPort, EcheqRepositoryPort } from '../echeq.ports';
import { PendingEcheq } from '../echeq.types';
import { requiredString } from '../echeq.validation';

export class ListPendingEcheqsUseCase {
  constructor(
    private readonly repository: EcheqRepositoryPort,
    private readonly clock: EcheqClockPort,
  ) {}

  async execute(companyId: string): Promise<PendingEcheq[]> {
    const company = requiredString(companyId, 'companyId');
    const rows = await this.repository.findAllByCompany(company, 'PENDIENTE');
    const now = this.clock.now();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    return rows
      .sort(
        (a, b) =>
          a.dueDate.getTime() - b.dueDate.getTime() || a.id.localeCompare(b.id),
      )
      .map((row) => ({ ...row, overdue: row.dueDate < today }));
  }
}
