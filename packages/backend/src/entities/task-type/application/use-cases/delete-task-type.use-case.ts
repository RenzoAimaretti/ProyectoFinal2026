import { EntityNotFoundError } from '../../domain/errors';
import { TaskTypeRepositoryPort } from '../task-type.ports';
import { RemoveTaskTypeOutput } from '../task-type.types';

export class DeleteTaskTypeUseCase {
  constructor(private readonly repository: TaskTypeRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<RemoveTaskTypeOutput> {
    const existing = await this.repository.findByIdForCompany(id, companyId);

    if (!existing) {
      throw new EntityNotFoundError(`Task type with id ${id} not found`);
    }

    await this.repository.deleteForCompany(id, companyId);

    return { message: `Task type with id ${id} deleted successfully` };
  }
}
