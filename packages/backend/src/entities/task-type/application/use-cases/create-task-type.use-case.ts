import { DuplicateEntityError } from '../../domain/errors';
import { TaskTypeRepositoryPort } from '../task-type.ports';
import { CreateTaskTypeInput, TaskTypeRecord } from '../task-type.types';
import { assertRequiredString, normalizeOptionalString } from '../task-type.validation';

export class CreateTaskTypeUseCase {
  constructor(private readonly repository: TaskTypeRepositoryPort) {}

  async execute(companyId: string, input: CreateTaskTypeInput): Promise<TaskTypeRecord> {
    const tenantCompanyId = assertRequiredString(companyId, 'companyId');
    const name = assertRequiredString(input?.name, 'name');
    const description = normalizeOptionalString(input?.description, 'description');

    const existing = await this.repository.findByNameAndCompanyId(name, tenantCompanyId);
    if (existing) {
      throw new DuplicateEntityError(
        `Task type with name ${name} already exists for company ${tenantCompanyId}`,
      );
    }

    return this.repository.create({ companyId: tenantCompanyId, name, description });
  }
}
