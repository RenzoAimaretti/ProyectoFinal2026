import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateWeightRecordUseCase } from './application/use-cases/create-weight-record.use-case';
import { DeleteWeightRecordUseCase } from './application/use-cases/delete-weight-record.use-case';
import { FindAllWeightRecordsUseCase } from './application/use-cases/find-all-weight-records.use-case';
import { FindWeightRecordUseCase } from './application/use-cases/find-weight-record.use-case';
import { UpdateWeightRecordUseCase } from './application/use-cases/update-weight-record.use-case';
import {
  CreateWeightRecordInput,
  UpdateWeightRecordInput,
} from './application/weight-record.types';
import {
  EntityNotFoundError,
  InvalidInputError,
} from './domain/errors';

@Injectable()
export class WeightRecordService {
  constructor(
    private readonly findAllUseCase: FindAllWeightRecordsUseCase,
    private readonly findOneUseCase: FindWeightRecordUseCase,
    private readonly createUseCase: CreateWeightRecordUseCase,
    private readonly updateUseCase: UpdateWeightRecordUseCase,
    private readonly deleteUseCase: DeleteWeightRecordUseCase,
  ) {}

  async findAll() {
    return this.handle(
      () => this.findAllUseCase.execute(),
      'fetching weight records',
    );
  }

  async findOne(id: string) {
    return this.handle(
      () => this.findOneUseCase.execute(id),
      'fetching weight record',
    );
  }

  async delete(id: string) {
    return this.handle(
      () => this.deleteUseCase.execute(id),
      'deleting weight record',
    );
  }

  async update(id: string, data: UpdateWeightRecordInput) {
    return this.handle(
      () => this.updateUseCase.execute(id, data),
      'updating weight record',
    );
  }

  async create(data: CreateWeightRecordInput) {
    return this.handle(
      () => this.createUseCase.execute(data),
      'creating weight record',
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

    if (error instanceof InvalidInputError) {
      return new BadRequestException(error.message);
    }

    console.error(`Error ${action}:`, error);
    return new InternalServerErrorException(`Error ${action}`);
  }
}
