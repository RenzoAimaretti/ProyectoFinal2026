import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateMachineInput, UpdateMachineInput } from './application/machine.types';
import { CreateMachineUseCase } from './application/use-cases/create-machine.use-case';
import { FindAllMachinesUseCase } from './application/use-cases/find-all-machines.use-case';
import { FindMachineUseCase } from './application/use-cases/find-machine.use-case';
import { UpdateMachineUseCase } from './application/use-cases/update-machine.use-case';
import { EntityNotFoundError, InvalidInputError } from './domain/errors';

@Injectable()
export class MachineService {
  constructor(
    private readonly findAllUseCase: FindAllMachinesUseCase,
    private readonly findOneUseCase: FindMachineUseCase,
    private readonly createUseCase: CreateMachineUseCase,
    private readonly updateUseCase: UpdateMachineUseCase,
  ) {}

  async findAll() {
    return this.handle(() => this.findAllUseCase.execute(), 'fetching machines');
  }

  async findOne(id: string) {
    return this.handle(() => this.findOneUseCase.execute(id), 'fetching machine');
  }

  async create(data: CreateMachineInput) {
    return this.handle(() => this.createUseCase.execute(data), 'creating machine');
  }

  async update(id: string, data: UpdateMachineInput) {
    return this.handle(() => this.updateUseCase.execute(id, data), 'updating machine');
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

    if (error instanceof InvalidInputError) {
      return new BadRequestException(error.message);
    }

    console.error(`Error ${action}:`, error);
    return new InternalServerErrorException(`Error ${action}`);
  }
}
