import { EntityNotFoundError, InvalidInputError, InvalidRelationError } from '../../domain/errors';
import {
  MachineReaderPort,
  MachineUsageRepositoryPort,
  TaskReaderPort,
  UserReaderPort,
} from '../machine-usage.ports';
import { CreateMachineUsageInput, MachineUsageRecord } from '../machine-usage.types';
import { assertRequiredString } from '../machine-usage.validation';

export class CreateMachineUsageUseCase {
  constructor(
    private readonly repository: MachineUsageRepositoryPort,
    private readonly machineReader: MachineReaderPort,
    private readonly taskReader: TaskReaderPort,
    private readonly userReader: UserReaderPort,
  ) {}

  async execute(companyId: string, input: CreateMachineUsageInput): Promise<MachineUsageRecord> {
    const machineId = assertRequiredString(input?.machineId, 'machineId');
    const taskId = assertRequiredString(input?.taskId, 'taskId');
    const operatorId = assertRequiredString(input?.operatorId, 'operatorId');

    const machine = await this.machineReader.findByIdForCompany(machineId, companyId);
    if (!machine) {
      if (await this.machineReader.findById(machineId)) {
        throw new InvalidRelationError('Machine does not belong to the current company');
      }

      throw new EntityNotFoundError('Machine, task, or operator not found');
    }

    const task = await this.taskReader.findByIdWithOperatorsForCompany(taskId, companyId);
    if (!task) {
      if (await this.taskReader.findByIdWithOperators(taskId)) {
        throw new InvalidRelationError('Task does not belong to the current company');
      }

      throw new EntityNotFoundError('Machine, task, or operator not found');
    }

    const operator = await this.userReader.findByIdForCompany(operatorId, companyId);
    if (!operator) {
      if (await this.userReader.findById(operatorId)) {
        throw new InvalidRelationError('Operator does not belong to the current company');
      }

      throw new EntityNotFoundError('Machine, task, or operator not found');
    }

    if (!task.operators.some((taskOperator) => taskOperator.id === operator.id)) {
      throw new InvalidRelationError('Operator is not assigned to the task');
    }

    if (machine.status !== 'ACTIVA') {
      throw new InvalidInputError('Machine esta en mantenimiento o inactiva');
    }

    return this.repository.create({
      machineId,
      taskId,
      initialFuel: input?.intialFuel,
    });
  }
}
