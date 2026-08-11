import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { DuplicateEntityError, InvalidInputError } from './domain/errors';
import {
  CreateModuleEntityInput,
  UpdateModuleEntityInput,
} from './application/module-entity.types';
import { CreateModuleEntityUseCase } from './application/use-cases/create-module-entity.use-case';
import { FindAllModuleEntitiesUseCase } from './application/use-cases/find-all-module-entities.use-case';
import { FindModuleEntityByNameUseCase } from './application/use-cases/find-module-entity-by-name.use-case';
import { FindModuleEntityUseCase } from './application/use-cases/find-module-entity.use-case';
import { UpdateModuleEntityUseCase } from './application/use-cases/update-module-entity.use-case';

@Injectable()
export class ModuleEntityService {
  constructor(
    private readonly findAllUseCase: FindAllModuleEntitiesUseCase,
    private readonly findOneUseCase: FindModuleEntityUseCase,
    private readonly findByNameUseCase: FindModuleEntityByNameUseCase,
    private readonly createUseCase: CreateModuleEntityUseCase,
    private readonly updateUseCase: UpdateModuleEntityUseCase,
  ) {}

  findAll() {
    return this.handle(() => this.findAllUseCase.execute(), 'fetching modules');
  }

  findOne(id: string) {
    return this.handle(
      () => this.findOneUseCase.execute(id),
      'fetching module',
    );
  }

  findByName(name: string) {
    return this.handle(
      () => this.findByNameUseCase.execute(name),
      'fetching module',
    );
  }

  create(data: CreateModuleEntityInput) {
    return this.handle(
      () => this.createUseCase.execute(data),
      'creating module',
    );
  }

  update(id: string, data: UpdateModuleEntityInput) {
    return this.handle(
      () => this.updateUseCase.execute(id, data),
      'updating module',
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
