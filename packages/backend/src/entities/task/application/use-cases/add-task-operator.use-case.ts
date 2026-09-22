import { DuplicateEntityError, EntityNotFoundError, InvalidRelationError } from '../../domain/errors';
import { TaskRepositoryPort, UserReaderPort } from '../task.ports';
import { AddTaskOperatorOutput, TaskWithOperatorsRecord } from '../task.types';

export class AddTaskOperatorUseCase {
  constructor(
    private readonly repository: TaskRepositoryPort,
    private readonly userReader: UserReaderPort,
  ) {}

  async execute(taskId: string, operatorId: string, tenantId: string): Promise<AddTaskOperatorOutput> {
    const task = await this.repository.findByIdWithOperatorsForTenant(taskId, tenantId);

    if (!task) {
      throw new EntityNotFoundError(`Task with id ${taskId} not found`);
    }

    const user = await this.userReader.findByIdForTenant(operatorId, tenantId);
    if (!user || user.role !== 'OPERARIO') {
      throw new InvalidRelationError(`Operator with id ${operatorId} does not belong to company ${tenantId}`);
    }

    if (task.operators.some((operator) => operator.id === operatorId)) {
      throw new DuplicateEntityError(
        `Operator with id ${operatorId} is already assigned to task with id ${taskId}`,
      );
    }

    await this.repository.addOperatorForTenant(taskId, tenantId, operatorId);

    return {
      message: `Operator with id ${operatorId} added to task with id ${taskId} successfully`,
    };
  }
}
