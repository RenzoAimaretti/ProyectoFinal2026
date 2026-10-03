import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClientModule } from '../client/client.module';
import {
  RECEPTION_CLIENT_READER,
  RECEPTION_CLOCK,
  RECEPTION_INPUT_READER,
  RECEPTION_REPOSITORY,
  RECEPTION_VALIDATION,
  ClockPort,
  ReceptionClientReaderPort,
  ReceptionInputReaderPort,
  ReceptionRepositoryPort,
  ReceptionValidationPort,
} from './application/reception.ports';
import { CreateReceptionUseCase } from './application/use-cases/create-reception.use-case';
import { FindReceptionByTenantUseCase } from './application/use-cases/find-reception-by-tenant.use-case';
import { FindReceptionUseCase } from './application/use-cases/find-reception.use-case';
import { FindReceptionsByClientUseCase } from './application/use-cases/find-receptions-by-client.use-case';
import { FindReceptionsByTenantUseCase } from './application/use-cases/find-receptions-by-tenant.use-case';
import { RejectReceptionUseCase } from './application/use-cases/reject-reception.use-case';
import { ValidateReceptionUseCase } from './application/use-cases/validate-reception.use-case';
import { ReceptionController } from './adapters/inbound/reception.controller';
import { PrismaReceptionClientReader } from './adapters/outbound/prisma-reception-client.reader';
import { PrismaReceptionInputReader } from './adapters/outbound/prisma-reception-input.reader';
import { PrismaReceptionRepository } from './adapters/outbound/prisma-reception.repository';
import { PrismaReceptionValidationAdapter } from './adapters/outbound/prisma-reception-validation.adapter';
import { ReceptionSystemClock } from './adapters/outbound/system-clock';

@Module({
  imports: [PrismaModule, ClientModule],
  controllers: [ReceptionController],
  providers: [
    PrismaReceptionRepository,
    PrismaReceptionValidationAdapter,
    PrismaReceptionClientReader,
    PrismaReceptionInputReader,
    ReceptionSystemClock,
    { provide: RECEPTION_REPOSITORY, useExisting: PrismaReceptionRepository },
    {
      provide: RECEPTION_VALIDATION,
      useExisting: PrismaReceptionValidationAdapter,
    },
    {
      provide: RECEPTION_CLIENT_READER,
      useExisting: PrismaReceptionClientReader,
    },
    {
      provide: RECEPTION_INPUT_READER,
      useExisting: PrismaReceptionInputReader,
    },
    { provide: RECEPTION_CLOCK, useExisting: ReceptionSystemClock },
    {
      provide: FindReceptionsByClientUseCase,
      useFactory: (repository: ReceptionRepositoryPort) =>
        new FindReceptionsByClientUseCase(repository),
      inject: [RECEPTION_REPOSITORY],
    },
    {
      provide: FindReceptionsByTenantUseCase,
      useFactory: (repository: ReceptionRepositoryPort) =>
        new FindReceptionsByTenantUseCase(repository),
      inject: [RECEPTION_REPOSITORY],
    },
    {
      provide: FindReceptionUseCase,
      useFactory: (repository: ReceptionRepositoryPort) =>
        new FindReceptionUseCase(repository),
      inject: [RECEPTION_REPOSITORY],
    },
    {
      provide: FindReceptionByTenantUseCase,
      useFactory: (repository: ReceptionRepositoryPort) =>
        new FindReceptionByTenantUseCase(repository),
      inject: [RECEPTION_REPOSITORY],
    },
    {
      provide: CreateReceptionUseCase,
      useFactory: (
        repository: ReceptionRepositoryPort,
        clientReader: ReceptionClientReaderPort,
        inputReader: ReceptionInputReaderPort,
      ) => new CreateReceptionUseCase(repository, clientReader, inputReader),
      inject: [RECEPTION_REPOSITORY, RECEPTION_CLIENT_READER, RECEPTION_INPUT_READER],
    },
    {
      provide: ValidateReceptionUseCase,
      useFactory: (
        repository: ReceptionRepositoryPort,
        validation: ReceptionValidationPort,
        clock: ClockPort,
      ) => new ValidateReceptionUseCase(repository, validation, clock),
      inject: [RECEPTION_REPOSITORY, RECEPTION_VALIDATION, RECEPTION_CLOCK],
    },
    {
      provide: RejectReceptionUseCase,
      useFactory: (
        repository: ReceptionRepositoryPort,
        validation: ReceptionValidationPort,
      ) => new RejectReceptionUseCase(repository, validation),
      inject: [RECEPTION_REPOSITORY, RECEPTION_VALIDATION],
    },
  ],
  exports: [
    FindReceptionsByClientUseCase,
    FindReceptionsByTenantUseCase,
    FindReceptionUseCase,
    FindReceptionByTenantUseCase,
    CreateReceptionUseCase,
    /**
     * Exported so the web application can expose the administrator decision.
     * Mobile clients must not receive this use case (CUU06, section 7.5).
     */
    ValidateReceptionUseCase,
    RejectReceptionUseCase,
  ],
})
export class ReceptionModule {}
