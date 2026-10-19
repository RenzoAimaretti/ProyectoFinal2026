import { ThresholdRepositoryPort } from '../threshold.ports';
import { validScope } from '../threshold.validation';
export class ListThresholdsUseCase {
  constructor(private readonly repository: ThresholdRepositoryPort) {}
  execute(companyId: string) { return this.repository.findAll(validScope(companyId, 'companyId')); }
}
