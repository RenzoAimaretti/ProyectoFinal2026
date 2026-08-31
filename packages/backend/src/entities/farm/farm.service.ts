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
} from './domain/errors';
import { CreateFarmUseCase } from './application/use-cases/create-farm.use-case';
import { FindAllFarmsUseCase } from './application/use-cases/find-all-farms.use-case';
import { FindFarmUseCase } from './application/use-cases/find-farm.use-case';
import { UpdateFarmUseCase } from './application/use-cases/update-farm.use-case';
import { CreateFarmInput, UpdateFarmInput } from './application/farm.types';

@Injectable()
export class FarmService {
  constructor(
    private readonly findAllUseCase: FindAllFarmsUseCase,
    private readonly findOneUseCase: FindFarmUseCase,
    private readonly createUseCase: CreateFarmUseCase,
    private readonly updateUseCase: UpdateFarmUseCase,
  ) {}

  findAll(companyId: string) {
    return this.handle(
      () => this.findAllUseCase.execute(companyId),
      'fetching farms',
    );
  }

  findOne(id: string, companyId: string) {
    return this.handle(
      () => this.findOneUseCase.execute(id, companyId),
      'fetching farm',
    );
  }

  create(companyId: string, data: CreateFarmInput) {
    return this.handle(
      () => this.createUseCase.execute(companyId, data),
      'creating farm',
    );
  }

  update(id: string, companyId: string, data: UpdateFarmInput) {
    return this.handle(
      () => this.updateUseCase.execute(id, companyId, data),
      'updating farm',
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

    if (error instanceof InvalidInputError) {
      return new BadRequestException(error.message);
    }

    console.error(`Error ${action}:`, error);
    return new InternalServerErrorException(`Error ${action}`);
  }
}
