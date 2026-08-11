import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AddCompanyModuleUseCase } from './application/use-cases/add-company-module.use-case';
import { CreateCompanyUseCase } from './application/use-cases/create-company.use-case';
import { FindAllCompaniesUseCase } from './application/use-cases/find-all-companies.use-case';
import { FindCompanyByCuitUseCase } from './application/use-cases/find-company-by-cuit.use-case';
import { FindCompanyUseCase } from './application/use-cases/find-company.use-case';
import { UpdateCompanyUseCase } from './application/use-cases/update-company.use-case';
import {
  COMPANY_REPOSITORY,
  MODULE_READER,
  CompanyRepositoryPort,
  ModuleReaderPort,
} from './application/company.ports';
import { PrismaCompanyRepository } from './adapters/outbound/prisma-company.repository';
import { PrismaModuleReader } from './adapters/outbound/prisma-module.reader';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyController],
  providers: [
    CompanyService,
    { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository },
    { provide: MODULE_READER, useClass: PrismaModuleReader },
    {
      provide: FindAllCompaniesUseCase,
      useFactory: (repository: CompanyRepositoryPort) =>
        new FindAllCompaniesUseCase(repository),
      inject: [COMPANY_REPOSITORY],
    },
    {
      provide: FindCompanyUseCase,
      useFactory: (repository: CompanyRepositoryPort) =>
        new FindCompanyUseCase(repository),
      inject: [COMPANY_REPOSITORY],
    },
    {
      provide: FindCompanyByCuitUseCase,
      useFactory: (repository: CompanyRepositoryPort) =>
        new FindCompanyByCuitUseCase(repository),
      inject: [COMPANY_REPOSITORY],
    },
    {
      provide: CreateCompanyUseCase,
      useFactory: (repository: CompanyRepositoryPort) =>
        new CreateCompanyUseCase(repository),
      inject: [COMPANY_REPOSITORY],
    },
    {
      provide: UpdateCompanyUseCase,
      useFactory: (repository: CompanyRepositoryPort) =>
        new UpdateCompanyUseCase(repository),
      inject: [COMPANY_REPOSITORY],
    },
    {
      provide: AddCompanyModuleUseCase,
      useFactory: (
        repository: CompanyRepositoryPort,
        moduleReader: ModuleReaderPort,
      ) => new AddCompanyModuleUseCase(repository, moduleReader),
      inject: [COMPANY_REPOSITORY, MODULE_READER],
    },
  ],
  exports: [CompanyService],
})
export class CompanyModule {}
