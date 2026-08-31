import { LivestockEventRepositoryPort } from '../livestock-event.ports';
import { LivestockEventRecord } from '../livestock-event.types';

export class FindAllLivestockEventsUseCase {
  constructor(private readonly repository: LivestockEventRepositoryPort) {}

  execute(companyId?: string): Promise<LivestockEventRecord[]> {
    if (!companyId) {
      return this.repository.findAll();
    }

    return this.repository.findAllByCompanyId(companyId);
  }
}
