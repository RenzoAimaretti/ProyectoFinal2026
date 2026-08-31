import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateLivestockMovementInput,
} from './application/livestock-movement.types';
import { CreateLivestockMovementUseCase } from './application/use-cases/create-livestock-movement.use-case';
import { FindAllLivestockMovementsUseCase } from './application/use-cases/find-all-livestock-movements.use-case';
import { FindLivestockMovementUseCase } from './application/use-cases/find-livestock-movement.use-case';
import { EntityNotFoundError, InvalidInputError, InvalidRelationError } from './domain/errors';

@Injectable()
export class LivestockMovementService {
  constructor(
    private readonly findAllUseCase: FindAllLivestockMovementsUseCase,
    private readonly findOneUseCase: FindLivestockMovementUseCase,
    private readonly createUseCase: CreateLivestockMovementUseCase,
  ) {}

  async findAll(companyId: string) {
    return this.handle(
      () => this.findAllUseCase.execute(companyId),
      'finding all livestock movements',
    );
  }

  async findOne(id: string, companyId: string) {
    return this.handle(
      () => this.findOneUseCase.execute(id, companyId),
      'finding livestock movement',
    );
  }

  async create(companyId: string, data: CreateLivestockMovementInput) {
    return this.handle(
      () => this.createUseCase.execute(companyId, data),
      'creating livestock movement',
    );
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

    if (error instanceof InvalidInputError || error instanceof InvalidRelationError) {
      return new BadRequestException(error.message);
    }

    console.error(`Error ${action}:`, error);
    return new InternalServerErrorException(`Error ${action}`);
  }
}
