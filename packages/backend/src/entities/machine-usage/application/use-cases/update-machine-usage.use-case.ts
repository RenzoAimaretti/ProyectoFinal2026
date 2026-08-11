import { EntityNotFoundError } from '../../domain/errors';
import { MachineUsageRepositoryPort } from '../machine-usage.ports';
import { MachineUsageRecord, UpdateMachineUsageData, UpdateMachineUsageInput } from '../machine-usage.types';

export class UpdateMachineUsageUseCase {
  constructor(private readonly repository: MachineUsageRepositoryPort) {}

  async execute(id: string, input: UpdateMachineUsageInput): Promise<MachineUsageRecord> {
    const existing = await this.repository.findById(id);

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
      data.usageHours = payload.usageHours;
    }

    if ('observations' in payload) {
      data.observations = payload.observations;
    }

    return this.repository.update(id, data);
  }
}
