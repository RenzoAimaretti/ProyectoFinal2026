import { EntityNotFoundError } from '../../domain/errors';
import { TaskRepositoryPort } from '../task.ports';

export class FindTaskUseCase {
  constructor(private readonly repository: TaskRepositoryPort) {}

  async execute(id: string, companyId: string) {
    const task = await this.repository.findByIdForCompany(id, companyId);

    if (!task) {
      throw new EntityNotFoundError(`Task with id ${id} not found`);
    }

    return task;
  }
}
