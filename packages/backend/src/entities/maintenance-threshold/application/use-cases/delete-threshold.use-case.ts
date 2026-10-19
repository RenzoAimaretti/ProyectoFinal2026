import { ThresholdRepositoryPort } from '../threshold.ports';
import { ThresholdNotFoundError, validScope } from '../threshold.validation';

export class DeleteThresholdUseCase {
  constructor(private readonly repository: ThresholdRepositoryPort) {}
  async execute(companyId: string, machineType: string) {
    const company = validScope(companyId, 'companyId');
    const type = validScope(machineType, 'machineType');
    if (!await this.repository.delete(company, type)) throw new ThresholdNotFoundError('Threshold not found');
  }
}
