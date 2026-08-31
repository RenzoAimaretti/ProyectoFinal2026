import { EntityNotFoundError, InvalidRelationError } from '../../domain/errors';
import { TaskRepositoryPort, UserReaderPort } from '../task.ports';
import { RemoveTaskOperatorOutput } from '../task.types';

export class RemoveTaskOperatorUseCase {
  constructor(
    private readonly repository: TaskRepositoryPort,
    private readonly userReader: UserReaderPort,
  ) {}

  async execute(
    taskId: string,
    operatorId: string,
    companyId: string,
  ): Promise<RemoveTaskOperatorOutput> {
    const task = await this.repository.findByIdWithOperatorsForCompany(taskId, companyId);

    if (!task) {
      throw new EntityNotFoundError(`Task with id ${taskId} not found`);
    }

    const user = await this.userReader.findByIdForCompany(operatorId, companyId);
    if (!user || user.role !== 'OPERARIO') {
      throw new InvalidRelationError(`Operator with id ${operatorId} does not belong to company ${companyId}`);
    }

    if (!task.operators.some((operator) => operator.id === operatorId)) {
      throw new EntityNotFoundError(
        `Operator with id ${operatorId} is not assigned to task with id ${taskId}`,
      );
    }

    await this.repository.removeOperatorForCompany(taskId, companyId, operatorId);

    return {
      message: `Operator with id ${operatorId} removed from task with id ${taskId} successfully`,
    };
  }
}
