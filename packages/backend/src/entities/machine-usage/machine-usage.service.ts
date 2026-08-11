import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateMachineUsageInput, UpdateMachineUsageInput } from './application/machine-usage.types';
import { CreateMachineUsageUseCase } from './application/use-cases/create-machine-usage.use-case';
import { FindAllMachineUsagesUseCase } from './application/use-cases/find-all-machine-usages.use-case';
import { FindMachineUsageUseCase } from './application/use-cases/find-machine-usage.use-case';
import { UpdateMachineUsageUseCase } from './application/use-cases/update-machine-usage.use-case';
import { EntityNotFoundError, InvalidInputError, InvalidRelationError } from './domain/errors';

@Injectable()
export class MachineUsageService {
  constructor(
    private readonly findAllUseCase: FindAllMachineUsagesUseCase,
    private readonly findOneUseCase: FindMachineUsageUseCase,
    private readonly createUseCase: CreateMachineUsageUseCase,
    private readonly updateUseCase: UpdateMachineUsageUseCase,
  ) {}

  async findAll() {
    return this.handle(() => this.findAllUseCase.execute(), 'finding all machine usages');
  }

  async findOne(id: string) {
    return this.handle(() => this.findOneUseCase.execute(id), 'finding machine usage');
  }

  async create(data: CreateMachineUsageInput) {
    return this.handle(() => this.createUseCase.execute(data), 'creating machine usage');
  }

  async update(id: string, data: UpdateMachineUsageInput) {
    return this.handle(() => this.updateUseCase.execute(id, data), 'updating machine usage');
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
