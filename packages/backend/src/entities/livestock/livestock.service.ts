import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from './domain/errors';
import { CreateLivestockUseCase } from './application/use-cases/create-livestock.use-case';
import { FindAllLivestockUseCase } from './application/use-cases/find-all-livestock.use-case';
import { FindLivestockUseCase } from './application/use-cases/find-livestock.use-case';
import { RemoveLivestockUseCase } from './application/use-cases/remove-livestock.use-case';
import { UpdateLivestockUseCase } from './application/use-cases/update-livestock.use-case';
import {
  CreateLivestockInput,
  UpdateLivestockInput,
} from './application/livestock.types';

@Injectable()
export class LivestockService {
  constructor(
    private readonly findAllUseCase: FindAllLivestockUseCase,
    private readonly findOneUseCase: FindLivestockUseCase,
    private readonly createUseCase: CreateLivestockUseCase,
    private readonly updateUseCase: UpdateLivestockUseCase,
    private readonly removeUseCase: RemoveLivestockUseCase,
  ) {}

  findAll() {
    return this.handle(
      () => this.findAllUseCase.execute(),
      'fetching livestock',
    );
  }

  findOne(id: string) {
    return this.handle(
      () => this.findOneUseCase.execute(id),
      'fetching livestock',
    );
  }

  create(data: CreateLivestockInput) {
    return this.handle(
      () => this.createUseCase.execute(data),
      'creating livestock',
    );
  }

  update(id: string, data: UpdateLivestockInput) {
    return this.handle(
      () => this.updateUseCase.execute(id, data),
      'updating livestock',
    );
  }

  remove(id: string) {
    return this.handle(
      () => this.removeUseCase.execute(id),
      'deleting livestock',
    );
  }

  private async handle<T>(
    operation: () => Promise<T>,
    action: string,
  ): Promise<T> {
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

    if (
      error instanceof InvalidRelationError ||
      error instanceof InvalidInputError
    ) {
      return new BadRequestException(error.message);
    }

    console.error(`Error ${action}:`, error);
    return new InternalServerErrorException(`Error ${action}`);
  }
}
