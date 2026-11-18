import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EcheqController } from './adapters/inbound/echeq.controller';
import { PrismaEcheqRepository } from './adapters/outbound/prisma-echeq.repository';
import { EcheqSystemClock } from './adapters/outbound/system-clock';
import {
  ECHEQ_CLOCK,
  ECHEQ_REPOSITORY,
  EcheqClockPort,
  EcheqRepositoryPort,
} from './application/echeq.ports';
import { ConciliateEcheqUseCase } from './application/use-cases/conciliate-echeq.use-case';
import { CreateEcheqUseCase } from './application/use-cases/create-echeq.use-case';
import { FindEcheqUseCase } from './application/use-cases/find-echeq.use-case';
import { ListEcheqsUseCase } from './application/use-cases/list-echeqs.use-case';
import { ListPendingEcheqsUseCase } from './application/use-cases/list-pending-echeqs.use-case';
import { RejectEcheqUseCase } from './application/use-cases/reject-echeq.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [EcheqController],
  providers: [
    PrismaEcheqRepository,
    EcheqSystemClock,
    { provide: ECHEQ_REPOSITORY, useExisting: PrismaEcheqRepository },
    { provide: ECHEQ_CLOCK, useExisting: EcheqSystemClock },
    {
      provide: CreateEcheqUseCase,
      useFactory: (repository: EcheqRepositoryPort) =>
        new CreateEcheqUseCase(repository),
      inject: [ECHEQ_REPOSITORY],
    },
    {
      provide: FindEcheqUseCase,
      useFactory: (repository: EcheqRepositoryPort) =>
        new FindEcheqUseCase(repository),
      inject: [ECHEQ_REPOSITORY],
    },
    {
      provide: ListEcheqsUseCase,
      useFactory: (repository: EcheqRepositoryPort) =>
        new ListEcheqsUseCase(repository),
      inject: [ECHEQ_REPOSITORY],
    },
    {
      provide: ListPendingEcheqsUseCase,
      useFactory: (repository: EcheqRepositoryPort, clock: EcheqClockPort) =>
        new ListPendingEcheqsUseCase(repository, clock),
      inject: [ECHEQ_REPOSITORY, ECHEQ_CLOCK],
    },
    {
      provide: ConciliateEcheqUseCase,
      useFactory: (repository: EcheqRepositoryPort) =>
        new ConciliateEcheqUseCase(repository),
      inject: [ECHEQ_REPOSITORY],
    },
    {
      provide: RejectEcheqUseCase,
      useFactory: (repository: EcheqRepositoryPort) =>
        new RejectEcheqUseCase(repository),
      inject: [ECHEQ_REPOSITORY],
    },
  ],
})
export class EcheqModule {}
