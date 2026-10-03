import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  CLIENT_PASSWORD_HASHER,
  CLIENT_REPOSITORY,
  CLIENT_USER_READER,
  ClientPasswordHasherPort,
  ClientRepositoryPort,
} from './application/client.ports';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case';
import { FindAllClientsUseCase } from './application/use-cases/find-all-clients.use-case';
import { FindClientUseCase } from './application/use-cases/find-client.use-case';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case';
import { CreateClientWithAccessUseCase } from './application/use-cases/create-client-with-access.use-case';
import { FindClientProfileUseCase } from './application/use-cases/find-client-profile.use-case';
import { UpdateClientProfileUseCase } from './application/use-cases/update-client-profile.use-case';
import { ClientController } from './adapters/inbound/client.controller';
import {
  ClientPasswordHasher,
  PrismaClientRepository,
} from './adapters/outbound/prisma-client.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ClientController],
  providers: [
    PrismaClientRepository,
    ClientPasswordHasher,
    { provide: CLIENT_REPOSITORY, useExisting: PrismaClientRepository },
    { provide: CLIENT_USER_READER, useExisting: PrismaClientRepository },
    { provide: CLIENT_PASSWORD_HASHER, useExisting: ClientPasswordHasher },
    {
      provide: FindAllClientsUseCase,
      useFactory: (repository: ClientRepositoryPort) =>
        new FindAllClientsUseCase(repository),
      inject: [CLIENT_REPOSITORY],
    },
    {
      provide: FindClientUseCase,
      useFactory: (repository: ClientRepositoryPort) =>
        new FindClientUseCase(repository),
      inject: [CLIENT_REPOSITORY],
    },
    {
      provide: CreateClientUseCase,
      useFactory: (repository: ClientRepositoryPort) =>
        new CreateClientUseCase(repository),
      inject: [CLIENT_REPOSITORY],
    },
    {
      provide: UpdateClientUseCase,
      useFactory: (repository: ClientRepositoryPort) =>
        new UpdateClientUseCase(repository),
      inject: [CLIENT_REPOSITORY],
    },
    {
      provide: CreateClientWithAccessUseCase,
      useFactory: (
        repository: ClientRepositoryPort,
        passwordHasher: ClientPasswordHasherPort,
      ) => new CreateClientWithAccessUseCase(repository, passwordHasher),
      inject: [CLIENT_REPOSITORY, CLIENT_PASSWORD_HASHER],
    },
    {
      provide: FindClientProfileUseCase,
      useFactory: (repository: ClientRepositoryPort) =>
        new FindClientProfileUseCase(repository),
      inject: [CLIENT_REPOSITORY],
    },
    {
      provide: UpdateClientProfileUseCase,
      useFactory: (repository: ClientRepositoryPort) =>
        new UpdateClientProfileUseCase(repository),
      inject: [CLIENT_REPOSITORY],
    },
  ],
  exports: [
    FindAllClientsUseCase,
    FindClientUseCase,
    CreateClientUseCase,
    UpdateClientUseCase,
    CreateClientWithAccessUseCase,
    FindClientProfileUseCase,
    UpdateClientProfileUseCase,
    CLIENT_USER_READER,
  ],
})
export class ClientModule {}
