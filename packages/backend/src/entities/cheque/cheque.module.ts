import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChequeController } from './adapters/inbound/cheque.controller';
import { PrismaChequeRepository } from './adapters/outbound/prisma-cheque.repository';
import { PrismaChequePaymentReader } from './adapters/outbound/prisma-cheque-payment-reader';
import {
  CHEQUE_PAYMENT_READER,
  CHEQUE_REPOSITORY,
  ChequePaymentReaderPort,
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
    PrismaChequePaymentReader,
    { provide: CHEQUE_REPOSITORY, useExisting: PrismaChequeRepository },
    { provide: CHEQUE_PAYMENT_READER, useExisting: PrismaChequePaymentReader },
    {
      provide: CreateChequeUseCase,
      useFactory: (
        repository: ChequeRepositoryPort,
        payments: ChequePaymentReaderPort,
      ) => new CreateChequeUseCase(repository, payments),
      inject: [CHEQUE_REPOSITORY, CHEQUE_PAYMENT_READER],
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
