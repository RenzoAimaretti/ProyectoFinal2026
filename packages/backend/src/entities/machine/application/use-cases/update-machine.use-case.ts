import { EntityNotFoundError } from '../../domain/errors';
import { MachineRepositoryPort } from '../machine.ports';
import { MachineRecord, UpdateMachineData, UpdateMachineInput } from '../machine.types';
import {
  normalizeMachineStatus,
  normalizeOptionalString,
  normalizeRequiredDate,
} from '../machine.validation';

export class UpdateMachineUseCase {
  constructor(private readonly repository: MachineRepositoryPort) {}

  async execute(id: string, input: UpdateMachineInput): Promise<MachineRecord> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new EntityNotFoundError(`Machine with id ${id} not found`);
    }

    const payload = (input ?? {}) as Record<string, unknown>;
    const data: UpdateMachineData = {};

    if ('name' in payload) {
      data.name = normalizeOptionalString(payload.name, 'name');
    }

    if ('brand' in payload) {
      data.brand = normalizeOptionalString(payload.brand, 'brand');
    }

    if ('entryDate' in payload) {
      data.entryDate = normalizeRequiredDate(payload.entryDate, 'entryDate');
    }

    if ('status' in payload) {
      data.status = normalizeMachineStatus(payload.status);
    }

    if ('maintenanceDate' in payload) {
      data.maintenanceDate = normalizeRequiredDate(payload.maintenanceDate, 'maintenanceDate');
    }

    return this.repository.update(id, data);
  }
}
