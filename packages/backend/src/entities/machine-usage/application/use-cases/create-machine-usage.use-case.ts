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

  async execute(input: CreateMachineUsageInput): Promise<MachineUsageRecord> {
    const machineId = assertRequiredString(input?.machineId, 'machineId');
    const taskId = assertRequiredString(input?.taskId, 'taskId');
    const operatorId = assertRequiredString(input?.operatorId, 'operatorId');

    const machine = await this.machineReader.findById(machineId);
    const task = await this.taskReader.findByIdWithOperators(taskId);
    const operator = await this.userReader.findById(operatorId);

    if (!machine || !task || !operator) {
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
