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
  LotHasRelationsError,
} from './domain/errors';
import { CreateLotUseCase } from './application/use-cases/create-lot.use-case';
import { FindAllLotsUseCase } from './application/use-cases/find-all-lots.use-case';
import { FindLotUseCase } from './application/use-cases/find-lot.use-case';
import { UpdateLotUseCase } from './application/use-cases/update-lot.use-case';
import { DeleteLotUseCase } from './application/use-cases/delete-lot.use-case';
import { DeriveLotStatesUseCase } from './application/use-cases/derive-lot-states.use-case';
import { CreateLotInput, UpdateLotInput } from './application/lot.types';
import {
  CLIENT_USER_READER,
  ClientUserReaderPort,
} from '../client/application/client.ports';

@Injectable()
export class LotService {
  constructor(
    private readonly findAllLotsUseCase: FindAllLotsUseCase,
    private readonly findLotUseCase: FindLotUseCase,
    private readonly createLotUseCase: CreateLotUseCase,
    private readonly updateLotUseCase: UpdateLotUseCase,
    private readonly deleteLotUseCase: DeleteLotUseCase,
    private readonly deriveLotStates: DeriveLotStatesUseCase,
    @Inject(CLIENT_USER_READER)
    private readonly clientUserReader: ClientUserReaderPort,
  ) {}

  async findAll(tenantId: string) {
    try {
      const lots = await this.findAllLotsUseCase.execute(tenantId);

      return await this.deriveLotStates.execute(lots);
    } catch (error) {
      this.handleUnexpectedError('Error fetching lots', error);
    }
  }

  /**
   * Server-side scoping: a PRODUCTOR only sees the lots that belong to the
   * client linked to their own user id. Other roles keep the tenant-wide read.
   */
  async findAllForUser(tenantId: string, userId: string, role: string) {
    try {
      const lots =
        role === 'PRODUCTOR'
          ? await this.readLotsForClientUser(userId)
          : await this.findAllLotsUseCase.execute(tenantId);

      return await this.deriveLotStates.execute(lots);
    } catch (error) {
      this.handleUnexpectedError('Error fetching lots', error);
    }
  }

  private async readLotsForClientUser(userId: string) {
    const clientId = await this.clientUserReader.findClientIdByUserId(userId);

    if (!clientId) {
      return [];
    }

    return this.findAllLotsUseCase.executeByClient(clientId);
  }

  async findOne(id: string, tenantId: string) {
    try {
      const lot = await this.findLotUseCase.execute(id, tenantId);
      const [withState] = await this.deriveLotStates.execute([lot]);

      return withState;
    } catch (error) {
      this.handleLotReadError('Error fetching lot', error);
    }
  }

  async create(tenantId: string, data: CreateLotInput) {
    try {
      return await this.createLotUseCase.execute(tenantId, data);
    } catch (error) {
      this.handleCreateError(error);
    }
  }

  async update(id: string, tenantId: string, data: UpdateLotInput) {
    try {
      return await this.updateLotUseCase.execute(id, tenantId, data);
    } catch (error) {
      this.handleUpdateError(id, error);
    }
  }

  async delete(id: string, tenantId: string): Promise<void> {
    try {
      await this.deleteLotUseCase.execute(id, tenantId);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof LotHasRelationsError) {
        throw new ConflictException(error.message);
      }
      this.handleUnexpectedError(`Error deleting lot ${id}`, error);
    }
  }

  private handleCreateError(error: unknown): never {
    if (error instanceof InvalidInputError) {
      // The domain owns the message. The previous catch-all named `coords`,
      // which is now optional, and it hid the polygon rejection reason from the
      // client that has to fix it.
      throw new BadRequestException(error.message);
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
