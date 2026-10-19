import { ThresholdRepositoryPort } from '../threshold.ports';
import { validLimits, validScope } from '../threshold.validation';

export class UpsertThresholdUseCase {
  constructor(private readonly repository: ThresholdRepositoryPort) {}
  execute(companyId: string, machineType: string, input: unknown) {
    const company = validScope(companyId, 'companyId');
    const type = validScope(machineType, 'machineType');
    const limits = validLimits(input);
    return this.repository.upsert(company, type, limits);
  }
}
