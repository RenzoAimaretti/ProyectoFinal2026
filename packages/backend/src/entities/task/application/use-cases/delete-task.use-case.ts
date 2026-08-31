import { EntityNotFoundError } from '../../domain/errors';
import { TaskRepositoryPort } from '../task.ports';
import { RemoveTaskOperatorOutput } from '../task.types';

export class DeleteTaskUseCase {
  constructor(private readonly repository: TaskRepositoryPort) {}

  async execute(id: string, companyId: string): Promise<RemoveTaskOperatorOutput> {
    const existing = await this.repository.findByIdForCompany(id, companyId);

    if (!existing) {
      throw new EntityNotFoundError(`Task with id ${id} not found`);
    }

    await this.repository.deleteForCompany(id, companyId);

    return { message: `Task with id ${id} deleted successfully` };
  }
}
