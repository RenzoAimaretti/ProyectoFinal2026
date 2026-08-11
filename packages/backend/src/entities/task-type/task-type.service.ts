import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTaskTypeUseCase } from './application/use-cases/create-task-type.use-case';
import { DeleteTaskTypeUseCase } from './application/use-cases/delete-task-type.use-case';
import { FindAllTaskTypesUseCase } from './application/use-cases/find-all-task-types.use-case';
import { FindTaskTypeUseCase } from './application/use-cases/find-task-type.use-case';
import { UpdateTaskTypeUseCase } from './application/use-cases/update-task-type.use-case';
import { CreateTaskTypeInput, UpdateTaskTypeInput } from './application/task-type.types';
import { DuplicateEntityError, EntityNotFoundError, InvalidInputError } from './domain/errors';

@Injectable()
export class TaskTypeService {
  constructor(
    private readonly findAllUseCase: FindAllTaskTypesUseCase,
    private readonly findOneUseCase: FindTaskTypeUseCase,
    private readonly createUseCase: CreateTaskTypeUseCase,
    private readonly updateUseCase: UpdateTaskTypeUseCase,
    private readonly deleteUseCase: DeleteTaskTypeUseCase,
  ) {}

  async findAll() {
    return this.handle(() => this.findAllUseCase.execute(), 'fetching task types');
  }

  async findOne(id: string) {
    return this.handle(() => this.findOneUseCase.execute(id), 'fetching task type');
  }

  async create(data: CreateTaskTypeInput) {
    return this.handle(() => this.createUseCase.execute(data), 'creating task type');
  }

  async update(id: string, data: UpdateTaskTypeInput) {
    return this.handle(() => this.updateUseCase.execute(id, data), 'updating task type');
  }

  async delete(id: string) {
    return this.handle(() => this.deleteUseCase.execute(id), 'deleting task type');
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

    console.error(`Error ${action}:`, error);
    return new InternalServerErrorException(`Error ${action}`);
  }
}
