import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  CLIENT_REPOSITORY,
  ClientRepositoryPort,
} from './application/client.ports';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case';
import { FindAllClientsUseCase } from './application/use-cases/find-all-clients.use-case';
import { FindClientUseCase } from './application/use-cases/find-client.use-case';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case';
import { PrismaClientRepository } from './adapters/outbound/prisma-client.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaClientRepository,
    { provide: CLIENT_REPOSITORY, useExisting: PrismaClientRepository },
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
  ],
  exports: [
    FindAllClientsUseCase,
    FindClientUseCase,
    CreateClientUseCase,
    UpdateClientUseCase,
  ],
})
export class ClientModule {}
