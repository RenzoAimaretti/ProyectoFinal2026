import { DuplicateEntityError, EntityNotFoundError } from '../../domain/errors';
import { TaskReaderPort, TaskTypeRepositoryPort } from '../task-type.ports';
import { TaskTypeRecord, UpdateTaskTypeInput } from '../task-type.types';
import { assertNonEmptyObject, normalizeOptionalString } from '../task-type.validation';

export class UpdateTaskTypeUseCase {
  constructor(
    private readonly repository: TaskTypeRepositoryPort,
    private readonly taskReader: TaskReaderPort,
  ) {}

  async execute(id: string, companyId: string, input: UpdateTaskTypeInput): Promise<TaskTypeRecord> {
    const payload = assertNonEmptyObject(input);
    const existing = await this.repository.findByIdForCompany(id, companyId);

    if (!existing) {
      throw new EntityNotFoundError(`Task type with id ${id} not found`);
    }

    const data: UpdateTaskTypeInput = {};

    if ('name' in payload) {
      data.name = normalizeOptionalString(payload.name, 'name');
    }

    if ('description' in payload) {
      data.description = normalizeOptionalString(payload.description, 'description');
    }

    if ('taskIds' in payload) {
      const taskIds = Array.isArray(payload.taskIds) ? payload.taskIds : [];
      const tasks = await this.taskReader.findByIdsForCompany(taskIds, companyId);
      const foundIds = tasks.map((task) => task.id);
      const missingIds = taskIds.filter((taskId) => !foundIds.includes(taskId));

      if (missingIds.length > 0) {
        throw new EntityNotFoundError(`Tasks with ids ${missingIds.join(', ')} not found`);
      }

      data.taskIds = taskIds;
    }

    if (data.name !== undefined && data.name !== existing.name) {
      const duplicate = await this.repository.findByNameAndCompanyId(
        data.name,
        companyId,
      );

      if (duplicate && duplicate.id !== id) {
        throw new DuplicateEntityError(
          `Task type with name ${data.name} already exists for company ${companyId}`,
        );
      }
    }

    return this.repository.updateForCompany(id, companyId, data);
  }
}
