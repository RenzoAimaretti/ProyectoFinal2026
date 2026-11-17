import { EntityNotFoundError } from '../../domain/errors';
import { MachineUsageRepositoryPort } from '../machine-usage.ports';
import { MachineUsageRecord, UpdateMachineUsageData, UpdateMachineUsageInput } from '../machine-usage.types';
import { assertOptionalPositiveNumber } from '../machine-usage.validation';

export class UpdateMachineUsageUseCase {
  constructor(private readonly repository: MachineUsageRepositoryPort) {}

  async execute(
    id: string,
    companyId: string,
    input: UpdateMachineUsageInput,
  ): Promise<MachineUsageRecord> {
    const existing = await this.repository.findByIdForCompany(id, companyId);

    if (!existing) {
      throw new EntityNotFoundError(`Machine usage with id ${id} not found`);
    }

    const payload = (input ?? {}) as UpdateMachineUsageInput;
    const data: UpdateMachineUsageData = {};

    if ('initialFuel' in payload) {
      data.initialFuel = payload.initialFuel;
    }

    if ('finalFuel' in payload) {
      data.finalFuel = payload.finalFuel;
    }

    if ('usageHours' in payload) {
      data.usageHours = assertOptionalPositiveNumber(payload.usageHours, 'usageHours');
    }

    if ('hectares' in payload) {
      data.hectares = assertOptionalPositiveNumber(payload.hectares, 'hectares');
    }

    if ('observations' in payload) {
      data.observations = payload.observations;
    }

    return this.repository.updateForCompany(id, companyId, data);
  }
}
