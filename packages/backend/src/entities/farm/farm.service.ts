import {
  BadRequestException,
  ConflictException,
  Inject,
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
import { CreateFarmUseCase } from './application/use-cases/create-farm.use-case';
import { FindAllFarmsUseCase } from './application/use-cases/find-all-farms.use-case';
import { FindFarmUseCase } from './application/use-cases/find-farm.use-case';
import { UpdateFarmUseCase } from './application/use-cases/update-farm.use-case';
import { CreateFarmInput, UpdateFarmInput } from './application/farm.types';
import {
  CLIENT_USER_READER,
  ClientUserReaderPort,
} from '../client/application/client.ports';

@Injectable()
export class FarmService {
  constructor(
    private readonly findAllUseCase: FindAllFarmsUseCase,
    private readonly findOneUseCase: FindFarmUseCase,
    private readonly createUseCase: CreateFarmUseCase,
    private readonly updateUseCase: UpdateFarmUseCase,
    @Inject(CLIENT_USER_READER)
    private readonly clientUserReader: ClientUserReaderPort,
  ) {}

  findAll(tenantId: string) {
    return this.handle(
      () => this.findAllUseCase.execute(tenantId),
      'fetching farms',
    );
  }

  /**
   * Server-side scoping: a PRODUCTOR only ever sees the farms of the client
   * linked to their own user id. Any other role keeps the tenant-wide read.
   */
  findAllForUser(tenantId: string, userId: string, role: string) {
    return this.handle(
      async () => {
        if (role === 'PRODUCTOR') {
          const clientId = await this.clientUserReader.findClientIdByUserId(userId);
          if (!clientId) {
            return [];
          }

          return this.findAllUseCase.executeByClient(clientId);
        }

        return this.findAllUseCase.execute(tenantId);
      },
      'fetching farms',
    );
  }

  findOne(id: string, tenantId: string) {
    return this.handle(
      () => this.findOneUseCase.execute(id, tenantId),
      'fetching farm',
    );
  }

  create(tenantId: string, data: CreateFarmInput) {
    return this.handle(
      () => this.createUseCase.execute(tenantId, data),
      'creating farm',
    );
  }

  update(id: string, tenantId: string, data: UpdateFarmInput) {
    return this.handle(
      () => this.updateUseCase.execute(id, tenantId, data),
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

    if (error instanceof InvalidInputError || error instanceof InvalidRelationError) {
      return new BadRequestException(error.message);
    }

    console.error(`Error ${action}:`, error);
    return new InternalServerErrorException(`Error ${action}`);
  }
}
