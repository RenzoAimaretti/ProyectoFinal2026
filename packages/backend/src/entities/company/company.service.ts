import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AddCompanyModuleUseCase } from './application/use-cases/add-company-module.use-case';
import { CreateCompanyUseCase } from './application/use-cases/create-company.use-case';
import { FindAllCompaniesUseCase } from './application/use-cases/find-all-companies.use-case';
import { FindCompanyByCuitUseCase } from './application/use-cases/find-company-by-cuit.use-case';
import { FindCompanyUseCase } from './application/use-cases/find-company.use-case';
import { UpdateCompanyUseCase } from './application/use-cases/update-company.use-case';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from './domain/errors';
import {
  CreateCompanyInput,
  UpdateCompanyInput,
} from './application/company.types';

@Injectable()
export class CompanyService {
  constructor(
    private readonly findAllUseCase: FindAllCompaniesUseCase,
    private readonly findOneUseCase: FindCompanyUseCase,
    private readonly findByCuitUseCase: FindCompanyByCuitUseCase,
    private readonly createUseCase: CreateCompanyUseCase,
    private readonly updateUseCase: UpdateCompanyUseCase,
    private readonly addModuleUseCase: AddCompanyModuleUseCase,
  ) {}

  findAll() {
    return this.handle(
      () => this.findAllUseCase.execute(),
      'fetching companies',
    );
  }

  findOne(id: string) {
    return this.handle(
      () => this.findOneUseCase.execute(id),
      'fetching company',
    );
  }

  findByCuit(cuit: string) {
    return this.handle(
      () => this.findByCuitUseCase.execute(cuit),
      'fetching company',
    );
  }

  create(data: CreateCompanyInput) {
    return this.handle(
      () => this.createUseCase.execute(data),
      'creating company',
    );
  }

  update(id: string, data: UpdateCompanyInput) {
    return this.handle(
      () => this.updateUseCase.execute(id, data),
      'updating company',
    );
  }

  addModule(companyId: string, moduleId: string) {
    return this.handle(
      () => this.addModuleUseCase.execute(companyId, moduleId),
      'adding module to company',
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

    if (error instanceof InvalidInputError) {
      return new BadRequestException(error.message);
    }

    console.error(`Error ${action}:`, error);
    return new InternalServerErrorException(`Error ${action}`);
  }
}
