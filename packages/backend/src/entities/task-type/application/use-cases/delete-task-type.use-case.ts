import { EntityNotFoundError } from '../../domain/errors';
import { TaskTypeRepositoryPort } from '../task-type.ports';
import { RemoveTaskTypeOutput } from '../task-type.types';

export class DeleteTaskTypeUseCase {
  constructor(private readonly repository: TaskTypeRepositoryPort) {}

  async execute(id: string): Promise<RemoveTaskTypeOutput> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new EntityNotFoundError(`Task type with id ${id} not found`);
    }

    await this.repository.delete(id);

    return { message: `Task type with id ${id} deleted successfully` };
  }
}
