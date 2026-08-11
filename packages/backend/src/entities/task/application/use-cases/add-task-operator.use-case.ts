import { DuplicateEntityError, EntityNotFoundError } from '../../domain/errors';
import { TaskRepositoryPort, UserReaderPort } from '../task.ports';
import { AddTaskOperatorOutput, TaskWithOperatorsRecord } from '../task.types';

export class AddTaskOperatorUseCase {
  constructor(
    private readonly repository: TaskRepositoryPort,
    private readonly userReader: UserReaderPort,
  ) {}

  async execute(taskId: string, operatorId: string): Promise<AddTaskOperatorOutput> {
    const task = await this.repository.findByIdWithOperators(taskId);

    if (!task) {
      throw new EntityNotFoundError(`Task with id ${taskId} not found`);
    }

    const user = await this.userReader.findById(operatorId);
    if (!user || user.role !== 'OPERARIO') {
      throw new EntityNotFoundError(`Operator with id ${operatorId} not found`);
    }

    if (task.operators.some((operator) => operator.id === operatorId)) {
      throw new DuplicateEntityError(
        `Operator with id ${operatorId} is already assigned to task with id ${taskId}`,
      );
    }

    await this.repository.addOperator(taskId, operatorId);

    return {
      message: `Operator with id ${operatorId} added to task with id ${taskId} successfully`,
    };
  }
}
