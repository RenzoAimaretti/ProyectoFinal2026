import { DuplicateUsageIdError, EntityNotFoundError, InvalidInputError, InvalidRelationError } from '../../domain/errors';
import {
  MachineReaderPort,
  MachineUsageRepositoryPort,
  TaskReaderPort,
  UserReaderPort,
} from '../machine-usage.ports';
import { CreateMachineUsageInput, MachineUsageRecord } from '../machine-usage.types';
import { assertOptionalClientId, assertOptionalNotes, assertOptionalPositiveNumber, assertOptionalWorkDate, assertRequiredString } from '../machine-usage.validation';

export class CreateMachineUsageUseCase {
  constructor(
    private readonly repository: MachineUsageRepositoryPort,
    private readonly machineReader: MachineReaderPort,
    private readonly taskReader: TaskReaderPort,
    private readonly userReader: UserReaderPort,
  ) {}

  async execute(companyId: string, input: CreateMachineUsageInput, actor?: { id: string; role: string }): Promise<MachineUsageRecord> {
    const id = assertOptionalClientId(input?.id);
    const machineId = assertRequiredString(input?.machineId, 'machineId');
    const taskId = assertRequiredString(input?.taskId, 'taskId');
    const operatorId = assertRequiredString(input?.operatorId, 'operatorId');
    if (actor?.role === 'OPERARIO' && actor.id !== operatorId) {
      throw new InvalidRelationError('Operator may only register their own usage');
    }
    const usageHours = assertOptionalPositiveNumber(input?.usageHours, 'usageHours');
    const hectares = assertOptionalPositiveNumber(input?.hectares, 'hectares');
    const workDate = assertOptionalWorkDate(input?.workDate);
    const observations = assertOptionalNotes(input?.observations);

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

    const matchesRetry = (existing: MachineUsageRecord | null): existing is MachineUsageRecord =>
      existing !== null && existing.machineId === machineId && existing.taskId === taskId &&
      existing.operatorId === operatorId && existing.initialFuel === (input?.intialFuel ?? null) &&
      existing.usageHours === (usageHours ?? null) && existing.hectares === (hectares ?? null) &&
      (existing.workDate?.getTime() ?? null) === (workDate?.getTime() ?? null) &&
      existing.observations === (observations ?? null);

    if (id) {
      const existing = await this.repository.findByIdForCompany(id, companyId);
      if (existing) {
        if (matchesRetry(existing)) return existing;
        throw new DuplicateUsageIdError();
      }
    }

    if (machine.status !== 'ACTIVA') {
      throw new InvalidInputError('Machine esta en mantenimiento o inactiva');
    }

    try {
      return await this.repository.create({
        ...(id ? { id } : {}),
        operatorId,
        machineId,
        taskId,
        initialFuel: input?.intialFuel,
        ...(usageHours !== undefined ? { usageHours } : {}),
        ...(hectares !== undefined ? { hectares } : {}),
        ...(workDate !== undefined ? { workDate } : {}),
        ...(observations !== undefined ? { observations } : {}),
      });
    } catch (error) {
      if (id && error instanceof DuplicateUsageIdError) {
        const existing = await this.repository.findByIdForCompany(id, companyId);
        if (matchesRetry(existing)) return existing;
      }
      throw error;
    }
  }
}
