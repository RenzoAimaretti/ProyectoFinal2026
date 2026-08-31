import { EntityNotFoundError } from '../../domain/errors';
import { MachineUsageRepositoryPort } from '../machine-usage.ports';

export class FindMachineUsageUseCase {
  constructor(private readonly repository: MachineUsageRepositoryPort) {}

  async execute(id: string, companyId: string) {
    const machineUsage = await this.repository.findByIdForCompany(id, companyId);

    if (!machineUsage) {
      throw new EntityNotFoundError(`Machine usage with id ${id} not found`);
    }

    return machineUsage;
  }
}
