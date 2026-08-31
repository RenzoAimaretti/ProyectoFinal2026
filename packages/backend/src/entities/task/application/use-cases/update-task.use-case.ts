import { EntityNotFoundError } from '../../domain/errors';
import { TaskRepositoryPort } from '../task.ports';
import { TaskOutput, UpdateTaskData, UpdateTaskInput } from '../task.types';
import {
  assertNonEmptyObject,
  normalizeOptionalDate,
  normalizeTaskStatus,
} from '../task.validation';

export class UpdateTaskUseCase {
  constructor(private readonly repository: TaskRepositoryPort) {}

  async execute(id: string, companyId: string, input: UpdateTaskInput): Promise<TaskOutput> {
    const payload = assertNonEmptyObject(input);
    const existing = await this.repository.findByIdForCompany(id, companyId);

    if (!existing) {
      throw new EntityNotFoundError(`Task with id ${id} not found`);
    }

    const data: UpdateTaskData = {};

    if ('status' in payload) {
      data.status = normalizeTaskStatus(payload.status);
    }

    if ('startedAt' in payload) {
      data.startedAt = normalizeOptionalDate(payload.startedAt, 'startedAt');
    }

    if ('finishedAt' in payload) {
      data.finishedAt = normalizeOptionalDate(payload.finishedAt, 'finishedAt');
    }

    return this.repository.updateForCompany(id, companyId, data);
  }
}
