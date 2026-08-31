import { LotRepositoryPort } from '../lot.ports';
import { LotRecord } from '../lot.types';

export class FindAllLotsUseCase {
  constructor(private readonly repository: LotRepositoryPort) {}

  async execute(companyId: string): Promise<LotRecord[]> {
    return this.repository.findAllByCompanyId(companyId);
  }
}
