import { LivestockEventRepositoryPort } from '../livestock-event.ports';
import { LivestockEventRecord } from '../livestock-event.types';

export class FindAllLivestockEventsUseCase {
  constructor(private readonly repository: LivestockEventRepositoryPort) {}

  execute(): Promise<LivestockEventRecord[]> {
    return this.repository.findAll();
  }
}
