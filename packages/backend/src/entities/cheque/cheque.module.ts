import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChequeController } from './adapters/inbound/cheque.controller';
import { PrismaChequeRepository } from './adapters/outbound/prisma-cheque.repository';
import {
  CHEQUE_REPOSITORY,
  ChequeRepositoryPort,
} from './application/cheque.ports';
import { ChangeChequeStatusUseCase } from './application/use-cases/change-cheque-status.use-case';
import { CreateChequeUseCase } from './application/use-cases/create-cheque.use-case';
import { FindChequeUseCase } from './application/use-cases/find-cheque.use-case';
import { ListChequesUseCase } from './application/use-cases/list-cheques.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [ChequeController],
  providers: [
    PrismaChequeRepository,
    { provide: CHEQUE_REPOSITORY, useExisting: PrismaChequeRepository },
    {
      provide: CreateChequeUseCase,
      useFactory: (repository: ChequeRepositoryPort) =>
        new CreateChequeUseCase(repository),
      inject: [CHEQUE_REPOSITORY],
    },
    {
      provide: FindChequeUseCase,
      useFactory: (repository: ChequeRepositoryPort) =>
        new FindChequeUseCase(repository),
      inject: [CHEQUE_REPOSITORY],
    },
    {
      provide: ListChequesUseCase,
      useFactory: (repository: ChequeRepositoryPort) =>
        new ListChequesUseCase(repository),
      inject: [CHEQUE_REPOSITORY],
    },
    {
      provide: ChangeChequeStatusUseCase,
      useFactory: (repository: ChequeRepositoryPort) =>
        new ChangeChequeStatusUseCase(repository),
      inject: [CHEQUE_REPOSITORY],
    },
  ],
})
export class ChequeModule {}
