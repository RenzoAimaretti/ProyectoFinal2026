import { EntityNotFoundError } from '../../domain/errors';
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

  async execute(input: CreateTaskInput): Promise<TaskOutput> {
    const lotId = assertRequiredString(input?.lotId, 'lotId');
    const taskTypeId = assertRequiredString(input?.taskTypeId, 'taskTypeId');
    const startedAt = normalizeRequiredDate(input?.startedAt, 'startedAt');

    const lot = await this.lotReader.findById(lotId);
    if (!lot) {
      throw new EntityNotFoundError(`Lot with id ${lotId} does not exist`);
    }

    const taskType = await this.taskTypeReader.findById(taskTypeId);
    if (!taskType) {
      throw new EntityNotFoundError(`Task type with id ${taskTypeId} does not exist`);
    }

    return this.repository.create({
      lotId,
      taskTypeId,
      startedAt,
    });
  }
}
