import {
  BadRequestException,
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
import { CreateLotUseCase } from './application/use-cases/create-lot.use-case';
import { FindAllLotsUseCase } from './application/use-cases/find-all-lots.use-case';
import { FindLotUseCase } from './application/use-cases/find-lot.use-case';
import { UpdateLotUseCase } from './application/use-cases/update-lot.use-case';
import { CreateLotInput, UpdateLotInput } from './application/lot.types';

@Injectable()
export class LotService {
  constructor(
    private readonly findAllLotsUseCase: FindAllLotsUseCase,
    private readonly findLotUseCase: FindLotUseCase,
    private readonly createLotUseCase: CreateLotUseCase,
    private readonly updateLotUseCase: UpdateLotUseCase,
  ) {}

  async findAll(companyId: string) {
    try {
      return await this.findAllLotsUseCase.execute(companyId);
    } catch (error) {
      this.handleUnexpectedError('Error fetching lots', error);
    }
  }

  async findOne(id: string, companyId: string) {
    try {
      return await this.findLotUseCase.execute(id, companyId);
    } catch (error) {
      this.handleLotReadError('Error fetching lot', error);
    }
  }

  async create(companyId: string, data: CreateLotInput) {
    try {
      return await this.createLotUseCase.execute(companyId, data);
    } catch (error) {
      this.handleCreateError(error);
    }
  }

  async update(id: string, companyId: string, data: UpdateLotInput) {
    try {
      return await this.updateLotUseCase.execute(id, companyId, data);
    } catch (error) {
      this.handleUpdateError(id, error);
    }
  }

  private handleCreateError(error: unknown): never {
    if (error instanceof InvalidInputError) {
      throw new BadRequestException(
        'Missing required fields: name, farmId, coords, and area',
      );
    }

    if (error instanceof InvalidRelationError) {
      throw new BadRequestException(error.message);
    }

    if (
      error instanceof EntityNotFoundError ||
      error instanceof DuplicateEntityError
    ) {
      throw new NotFoundException(
        'Farm with this ID does not exist or lot with this name already exists in the farm',
      );
    }

    this.handleUnexpectedError('Error creating lot', error);
  }

  private handleLotReadError(message: string, error: unknown): never {
    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException(error.message);
    }

    this.handleUnexpectedError(message, error);
  }

  private handleUpdateError(id: string, error: unknown): never {
    if (error instanceof InvalidInputError) {
      throw new BadRequestException(error.message);
    }

    if (error instanceof InvalidRelationError) {
      throw new BadRequestException(error.message);
    }

    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException(error.message);
    }

    this.handleUnexpectedError(`Error updating lot ${id}`, error);
  }

  private handleUnexpectedError(message: string, error: unknown): never {
    console.error(message + ':', error);
    throw new InternalServerErrorException(message);
  }
}
