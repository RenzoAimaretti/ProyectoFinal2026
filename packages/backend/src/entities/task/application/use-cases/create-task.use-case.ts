import { InvalidRelationError } from '../../domain/errors';
import { LotReaderPort, TaskRepositoryPort, TaskTypeReaderPort } from '../task.ports';
import { CreateTaskInput, TaskOutput } from '../task.types';
import {
  assertRequiredString,
  normalizeRequiredDate,
} from '../task.validation';

export class CreateTaskUseCase {
  constructor(
    private readonly repository: TaskRepositoryPort,
    private readonly lotReader: LotReaderPort,
    private readonly taskTypeReader: TaskTypeReaderPort,
  ) {}

  async execute(tenantId: string, input: CreateTaskInput): Promise<TaskOutput> {
    const lotId = assertRequiredString(input?.lotId, 'lotId');
    const taskTypeId = assertRequiredString(input?.taskTypeId, 'taskTypeId');
    const startedAt = normalizeRequiredDate(input?.startedAt, 'startedAt');

    const lot = await this.lotReader.findByIdForTenant(lotId, tenantId);
    if (!lot) {
      throw new InvalidRelationError(`Lot with id ${lotId} does not belong to company ${tenantId}`);
    }

    const taskType = await this.taskTypeReader.findByIdForTenant(taskTypeId, tenantId);
    if (!taskType) {
      throw new InvalidRelationError(
        `Task type with id ${taskTypeId} does not belong to company ${tenantId}`,
      );
    }

    // R2: whether a task needs a phytosanitary prescription is driven by the
    // TaskType.requiresPrescription column (never a name/description match). A
    // task that requires one is born SIN_RECETA; any other keeps the model
    // default (NO_REQUIERE), so the field is only sent when it must be set.
    const requiresPrescription = taskType.requiresPrescription === true;

    return this.repository.create({
      lotId,
      taskTypeId,
      startedAt,
      ...(requiresPrescription ? { prescriptionStatus: 'SIN_RECETA' as const } : {}),
    });
  }
}
