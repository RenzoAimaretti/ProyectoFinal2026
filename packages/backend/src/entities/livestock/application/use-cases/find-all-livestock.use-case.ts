import { LivestockRepositoryPort } from '../livestock.ports';
import { LivestockRecord } from '../livestock.types';

export class FindAllLivestockUseCase {
  constructor(private readonly repository: LivestockRepositoryPort) {}

  execute(companyId: string): Promise<LivestockRecord[]> {
    return this.repository.findAllByCompanyId(companyId);
  }
}
