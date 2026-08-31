import { EntityNotFoundError } from '../../domain/errors';
import { TaskTypeRepositoryPort } from '../task-type.ports';

export class FindTaskTypeUseCase {
  constructor(private readonly repository: TaskTypeRepositoryPort) {}

  async execute(id: string, companyId: string) {
    const taskType = await this.repository.findByIdForCompany(id, companyId);

    if (!taskType) {
      throw new EntityNotFoundError(`Task type with id ${id} not found`);
    }

    return taskType;
  }
}
