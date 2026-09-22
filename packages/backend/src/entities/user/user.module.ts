import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  COMPANY_READER,
  PASSWORD_HASHER,
  TENANT_READER,
  USER_REPOSITORY,
  CompanyReaderPort,
  PasswordHasherPort,
  TenantReaderPort,
  UserRepositoryPort,
} from './application/user.ports';
import { PrismaCompanyReader } from './adapters/outbound/prisma-company.reader';
import { PrismaTenantReader } from './adapters/outbound/prisma-tenant.reader';
import { PrismaUserRepository } from './adapters/outbound/prisma-user.repository';
import { UserPasswordHasher } from './adapters/outbound/user-password-hasher';
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
    { provide: PASSWORD_HASHER, useClass: UserPasswordHasher },
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
        passwordHasher: PasswordHasherPort,
      ) => new CreateUserUseCase(repository, tenantReader, companyReader, passwordHasher),
      inject: [USER_REPOSITORY, TENANT_READER, COMPANY_READER, PASSWORD_HASHER],
    },
    {
      provide: UpdateUserUseCase,
      useFactory: (repository: UserRepositoryPort, passwordHasher: PasswordHasherPort) =>
        new UpdateUserUseCase(repository, passwordHasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
    },
  ],
  exports: [UserService],
})
export class UserModule {}
