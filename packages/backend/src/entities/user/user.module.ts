import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  COMPANY_READER,
  TENANT_READER,
  USER_REPOSITORY,
  CompanyReaderPort,
  TenantReaderPort,
  UserRepositoryPort,
} from './application/user.ports';
import { PrismaCompanyReader } from './adapters/outbound/prisma-company.reader';
import { PrismaTenantReader } from './adapters/outbound/prisma-tenant.reader';
import { PrismaUserRepository } from './adapters/outbound/prisma-user.repository';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { FindAllUsersUseCase } from './application/use-cases/find-all-users.use-case';
import { FindUserUseCase } from './application/use-cases/find-user.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { UserService } from './user.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [
    UserService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: TENANT_READER, useClass: PrismaTenantReader },
    { provide: COMPANY_READER, useClass: PrismaCompanyReader },
    {
      provide: FindAllUsersUseCase,
      useFactory: (repository: UserRepositoryPort) => new FindAllUsersUseCase(repository),
      inject: [USER_REPOSITORY],
    },
    {
      provide: FindUserUseCase,
      useFactory: (repository: UserRepositoryPort) => new FindUserUseCase(repository),
      inject: [USER_REPOSITORY],
    },
    {
      provide: CreateUserUseCase,
      useFactory: (
        repository: UserRepositoryPort,
        tenantReader: TenantReaderPort,
        companyReader: CompanyReaderPort,
      ) => new CreateUserUseCase(repository, tenantReader, companyReader),
      inject: [USER_REPOSITORY, TENANT_READER, COMPANY_READER],
    },
    {
      provide: UpdateUserUseCase,
      useFactory: (repository: UserRepositoryPort) => new UpdateUserUseCase(repository),
      inject: [USER_REPOSITORY],
    },
  ],
  exports: [UserService],
})
export class UserModule {}
