import { InvalidRelationError } from '../../domain/errors';
import {
  assertMachineActivityFields,
  assertMachineActivityType,
} from '../../domain/machine-activity.rules';
import {
  ClockPort,
  MachineActivityRepositoryPort,
  MachineReaderPort,
} from '../machine-activity.ports';
import {
  MachineActivityRecord,
  RegisterMachineActivityInput,
} from '../machine-activity.types';
import {
  assertOptionalNumber,
  assertOptionalString,
  assertRequiredDate,
  assertRequiredString,
} from '../machine-activity.validation';

export class RegisterMachineActivityUseCase {
  constructor(
    private readonly repository: MachineActivityRepositoryPort,
    private readonly machineReader: MachineReaderPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(
    companyId: string,
    data: RegisterMachineActivityInput,
  ): Promise<MachineActivityRecord> {
    const company = assertRequiredString(companyId, 'companyId');
    const machineId = assertRequiredString(data.machineId, 'machineId');
    const type = assertMachineActivityType(data.type);
    const date = assertRequiredDate(data.date, 'date');
    const liters = assertOptionalNumber(data.liters, 'liters');
    const receipt = assertOptionalString(data.receipt, 'receipt');
    const cost = assertOptionalNumber(data.cost, 'cost');
    const spareParts = assertOptionalString(data.spareParts, 'spareParts');
    const usageHours = assertOptionalNumber(data.usageHours, 'usageHours');
    const hectares = assertOptionalNumber(data.hectares, 'hectares');
    const observations = assertOptionalString(
      data.observations,
      'observations',
    );

    assertMachineActivityFields(
      { type, date, liters, cost, spareParts, usageHours, hectares },
      this.clock.now(),
    );

    const machine = await this.machineReader.findByIdForCompany(
      machineId,
      company,
    );
    if (!machine) {
      throw new InvalidRelationError(
        `Machine with id ${machineId} not found for company ${company}`,
      );
    }

    return this.repository.create({
      machineId,
      companyId: company,
      type,
      date,
      liters,
      receipt,
      cost,
      spareParts,
      usageHours,
      hectares,
      observations,
    });
  }
}
