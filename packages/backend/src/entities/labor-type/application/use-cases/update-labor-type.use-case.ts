import { DuplicateEntityError, EntityNotFoundError } from '../../domain/errors';
import { TaskReaderPort, LaborTypeRepositoryPort } from '../labor-type.ports';
import { LaborTypeRecord, UpdateLaborTypeInput } from '../labor-type.types';
import { assertNonEmptyObject, normalizeOptionalString } from '../labor-type.validation';

export class UpdateLaborTypeUseCase {
  constructor(
    private readonly repository: LaborTypeRepositoryPort,
    private readonly taskReader: TaskReaderPort,
  ) {}

  async execute(id: string, tenantId: string, input: UpdateLaborTypeInput): Promise<LaborTypeRecord> {
    const payload = assertNonEmptyObject(input);
    const existing = await this.repository.findByIdForTenant(id, tenantId);

    if (!existing) {
      throw new EntityNotFoundError(`Labor type with id ${id} not found`);
    }

    const data: UpdateLaborTypeInput = {};

    if ('name' in payload) {
      data.name = normalizeOptionalString(payload.name, 'name');
    }

    if ('description' in payload) {
      data.description = normalizeOptionalString(payload.description, 'description');
    }

    if ('taskIds' in payload) {
      const taskIds = Array.isArray(payload.taskIds) ? payload.taskIds : [];
      const tasks = await this.taskReader.findByIdsForTenant(taskIds, tenantId);
      const foundIds = tasks.map((task) => task.id);
      const missingIds = taskIds.filter((taskId) => !foundIds.includes(taskId));

      if (missingIds.length > 0) {
        throw new EntityNotFoundError(`Tasks with ids ${missingIds.join(', ')} not found`);
      }

      data.taskIds = taskIds;
    }

    if (data.name !== undefined && data.name !== existing.name) {
      const duplicate = await this.repository.findByNameAndTenantId(
        data.name,
        tenantId,
      );

      if (duplicate && duplicate.id !== id) {
        throw new DuplicateEntityError(
          `Labor type with name ${data.name} already exists for company ${tenantId}`,
        );
      }
    }

    return this.repository.updateForTenant(id, tenantId, data);
  }
}
