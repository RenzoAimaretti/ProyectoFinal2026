import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateLaborTypeUseCase } from './application/use-cases/create-labor-type.use-case';
import { DeleteLaborTypeUseCase } from './application/use-cases/delete-labor-type.use-case';
import { FindAllLaborTypesUseCase } from './application/use-cases/find-all-labor-types.use-case';
import { FindLaborTypeUseCase } from './application/use-cases/find-labor-type.use-case';
import { UpdateLaborTypeUseCase } from './application/use-cases/update-labor-type.use-case';
import { CreateLaborTypeInput, UpdateLaborTypeInput } from './application/labor-type.types';
import { FindLaborTypeCategoriesUseCase } from './application/use-cases/find-labor-type-categories.use-case';
import { ReplaceLaborTypeCategoriesUseCase } from './application/use-cases/replace-labor-type-categories.use-case';
import { DuplicateEntityError, EntityNotFoundError, InvalidInputError } from './domain/errors';

@Injectable()
export class LaborTypeService {
  constructor(
    private readonly findAllUseCase: FindAllLaborTypesUseCase,
    private readonly findOneUseCase: FindLaborTypeUseCase,
    private readonly createUseCase: CreateLaborTypeUseCase,
    private readonly updateUseCase: UpdateLaborTypeUseCase,
    private readonly deleteUseCase: DeleteLaborTypeUseCase,
    private readonly findCategoriesUseCase: FindLaborTypeCategoriesUseCase,
    private readonly replaceCategoriesUseCase: ReplaceLaborTypeCategoriesUseCase,
  ) {}

  async findAll(tenantId: string) {
    return this.handle(() => this.findAllUseCase.execute(tenantId), 'fetching labor types');
  }

  async findOne(id: string, tenantId: string) {
    return this.handle(() => this.findOneUseCase.execute(id, tenantId), 'fetching labor type');
  }

  async create(tenantId: string, data: CreateLaborTypeInput) {
    return this.handle(() => this.createUseCase.execute(tenantId, data), 'creating labor type');
  }

  async update(id: string, tenantId: string, data: UpdateLaborTypeInput) {
    return this.handle(() => this.updateUseCase.execute(id, tenantId, data), 'updating labor type');
  }

  async delete(id: string, tenantId: string) {
    return this.handle(() => this.deleteUseCase.execute(id, tenantId), 'deleting labor type');
  }

  async findCategories(id: string, tenantId: string) {
    return this.handle(() => this.findCategoriesUseCase.execute(id, tenantId), 'fetching labor type categories');
  }

  async replaceCategories(id: string, tenantId: string, data: { categoryIds: string[] }) {
    return this.handle(() => this.replaceCategoriesUseCase.execute(id, tenantId, data), 'replacing labor type categories');
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
