import { FarmRepositoryPort } from '../farm.ports';
import { FarmRecord } from '../farm.types';

export class FindAllFarmsUseCase {
  constructor(private readonly repository: FarmRepositoryPort) {}

  execute(companyId: string): Promise<FarmRecord[]> {
    return this.repository.findAllByCompanyId(companyId);
  }
}
