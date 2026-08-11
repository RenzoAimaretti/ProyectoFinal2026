import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateLivestockEventUseCase } from './application/use-cases/create-livestock-event.use-case';
import { FindAllLivestockEventsUseCase } from './application/use-cases/find-all-livestock-events.use-case';
import { FindLivestockEventUseCase } from './application/use-cases/find-livestock-event.use-case';
import { UpdateLivestockEventUseCase } from './application/use-cases/update-livestock-event.use-case';
import {
  CreateLivestockEventInput,
  UpdateLivestockEventInput,
} from './application/livestock-event.types';
import {
  EntityNotFoundError,
  InvalidInputError,
} from './domain/errors';

@Injectable()
export class LivestockEventService {
  constructor(
    private readonly findAllUseCase: FindAllLivestockEventsUseCase,
    private readonly findOneUseCase: FindLivestockEventUseCase,
    private readonly createUseCase: CreateLivestockEventUseCase,
    private readonly updateUseCase: UpdateLivestockEventUseCase,
  ) {}

  async findAll() {
    return this.handle(() => this.findAllUseCase.execute(), 'fetching livestock events');
  }

  async findOne(id: string) {
    return this.handle(() => this.findOneUseCase.execute(id), 'fetching livestock event');
  }

  async update(id: string, data: UpdateLivestockEventInput) {
    return this.handle(
      () => this.updateUseCase.execute(id, data),
      'updating livestock event',
    );
  }

  async create(data: CreateLivestockEventInput) {
    return this.handle(
      () => this.createUseCase.execute(data),
      'creating livestock event',
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
