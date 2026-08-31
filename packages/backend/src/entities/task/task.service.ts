import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AddTaskOperatorUseCase } from './application/use-cases/add-task-operator.use-case';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { DeleteTaskUseCase } from './application/use-cases/delete-task.use-case';
import { FindAllTasksUseCase } from './application/use-cases/find-all-tasks.use-case';
import { FindTaskUseCase } from './application/use-cases/find-task.use-case';
import { RemoveTaskOperatorUseCase } from './application/use-cases/remove-task-operator.use-case';
import { UpdateTaskUseCase } from './application/use-cases/update-task.use-case';
import { CreateTaskInput, UpdateTaskInput } from './application/task.types';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from './domain/errors';

@Injectable()
export class TaskService {
  constructor(
    private readonly findAllUseCase: FindAllTasksUseCase,
    private readonly findOneUseCase: FindTaskUseCase,
    private readonly createUseCase: CreateTaskUseCase,
    private readonly updateUseCase: UpdateTaskUseCase,
    private readonly addOperatorUseCase: AddTaskOperatorUseCase,
    private readonly removeOperatorUseCase: RemoveTaskOperatorUseCase,
    private readonly deleteUseCase: DeleteTaskUseCase,
  ) {}

  async findAll(companyId: string) {
    return this.handle(() => this.findAllUseCase.execute(companyId), 'fetching tasks');
  }

  async findOne(id: string, companyId: string) {
    return this.handle(() => this.findOneUseCase.execute(id, companyId), 'fetching task');
  }

  async create(companyId: string, data: CreateTaskInput) {
    return this.handle(() => this.createUseCase.execute(companyId, data), 'creating task');
  }

  async update(id: string, companyId: string, data: UpdateTaskInput) {
    return this.handle(() => this.updateUseCase.execute(id, companyId, data), 'updating task');
  }

  async addOperario(taskId: string, operatorId: string, companyId: string) {
    return this.handle(
      () => this.addOperatorUseCase.execute(taskId, operatorId, companyId),
      'adding operator to task',
    );
  }

  async removeOperario(taskId: string, operatorId: string, companyId: string) {
    return this.handle(
      () => this.removeOperatorUseCase.execute(taskId, operatorId, companyId),
      'removing operator from task',
    );
  }

  async delete(id: string, companyId: string) {
    return this.handle(() => this.deleteUseCase.execute(id, companyId), 'deleting task');
  }

  private async handle<T>(operation: () => Promise<T>, action: string) {
    try {
      return await operation();
    } catch (error) {
      throw this.translateError(error, action);
    }
  }

  private translateError(error: unknown, action: string): Error {
    if (error instanceof EntityNotFoundError) {
      return new NotFoundException(error.message);
    }

    if (error instanceof DuplicateEntityError) {
      return new ConflictException(error.message);
    }

    if (error instanceof InvalidInputError) {
      return new BadRequestException(error.message);
    }

    if (error instanceof InvalidRelationError) {
      return new BadRequestException(error.message);
    }

    console.error(`Error ${action}:`, error);
    return new InternalServerErrorException(`Error ${action}`);
  }
}
