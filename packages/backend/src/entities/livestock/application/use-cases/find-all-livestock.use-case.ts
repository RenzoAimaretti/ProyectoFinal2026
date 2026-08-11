import { LivestockRepositoryPort } from '../livestock.ports';
import { LivestockRecord } from '../livestock.types';

export class FindAllLivestockUseCase {
  constructor(private readonly repository: LivestockRepositoryPort) {}

  execute(): Promise<LivestockRecord[]> {
    return this.repository.findAll();
  }
}
