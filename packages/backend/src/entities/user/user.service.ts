import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserInput, UpdateUserInput } from './application/user.types';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { FindAllUsersUseCase } from './application/use-cases/find-all-users.use-case';
import { FindUserUseCase } from './application/use-cases/find-user.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { DuplicateEntityError, EntityNotFoundError, InvalidInputError } from './domain/errors';

@Injectable()
export class UserService {
  constructor(
    private readonly findAllUseCase: FindAllUsersUseCase,
    private readonly findOneUseCase: FindUserUseCase,
    private readonly createUseCase: CreateUserUseCase,
    private readonly updateUseCase: UpdateUserUseCase,
  ) {}

  async findAll() {
    return this.handle(() => this.findAllUseCase.execute(), 'fetching users');
  }

  async findOne(id: string) {
    return this.handle(() => this.findOneUseCase.execute(id), 'fetching user');
  }

  async create(data: CreateUserInput) {
    return this.handle(() => this.createUseCase.execute(data), 'creating user');
  }

  async update(id: string, data: UpdateUserInput) {
    return this.handle(() => this.updateUseCase.execute(id, data), 'updating user');
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
