import { DuplicateEntityError } from '../../domain/errors';
import { TaskTypeRepositoryPort } from '../task-type.ports';
import { CreateTaskTypeInput, TaskTypeRecord } from '../task-type.types';
import { assertRequiredString, normalizeOptionalString } from '../task-type.validation';

export class CreateTaskTypeUseCase {
  constructor(private readonly repository: TaskTypeRepositoryPort) {}

  async execute(input: CreateTaskTypeInput): Promise<TaskTypeRecord> {
    const name = assertRequiredString(input?.name, 'name');
    const description = normalizeOptionalString(input?.description, 'description');

    const existing = await this.repository.findByName(name);
    if (existing) {
      throw new DuplicateEntityError(`Task type with name ${name} already exists`);
    }

    return this.repository.create({ name, description });
  }
}
