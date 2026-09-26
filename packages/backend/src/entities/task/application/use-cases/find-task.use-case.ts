import { EntityNotFoundError } from '../../domain/errors';
import { TaskRepositoryPort } from '../task.ports';

export class FindTaskUseCase {
  constructor(private readonly repository: TaskRepositoryPort) {}

  async execute(id: string, tenantId: string) {
    const task = await this.repository.findByIdForTenant(id, tenantId);

    if (!task) {
      throw new EntityNotFoundError(`Task with id ${id} not found`);
    }

    return task;
  }
}
