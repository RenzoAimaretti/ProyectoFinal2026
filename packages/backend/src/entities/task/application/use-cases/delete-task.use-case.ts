import { EntityNotFoundError } from '../../domain/errors';
import { TaskRepositoryPort } from '../task.ports';
import { RemoveTaskOperatorOutput } from '../task.types';

export class DeleteTaskUseCase {
  constructor(private readonly repository: TaskRepositoryPort) {}

  async execute(id: string): Promise<RemoveTaskOperatorOutput> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new EntityNotFoundError(`Task with id ${id} not found`);
    }

    await this.repository.delete(id);

    return { message: `Task with id ${id} deleted successfully` };
  }
}
