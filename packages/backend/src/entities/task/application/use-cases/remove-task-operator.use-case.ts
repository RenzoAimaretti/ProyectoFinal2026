import { EntityNotFoundError } from '../../domain/errors';
import { TaskRepositoryPort } from '../task.ports';
import { RemoveTaskOperatorOutput } from '../task.types';

export class RemoveTaskOperatorUseCase {
  constructor(private readonly repository: TaskRepositoryPort) {}

  async execute(taskId: string, operatorId: string): Promise<RemoveTaskOperatorOutput> {
    const task = await this.repository.findByIdWithOperators(taskId);

    if (!task) {
      throw new EntityNotFoundError(`Task with id ${taskId} not found`);
    }

    if (!task.operators.some((operator) => operator.id === operatorId)) {
      throw new EntityNotFoundError(
        `Operator with id ${operatorId} is not assigned to task with id ${taskId}`,
      );
    }

    await this.repository.removeOperator(taskId, operatorId);

    return {
      message: `Operator with id ${operatorId} removed from task with id ${taskId} successfully`,
    };
  }
}
