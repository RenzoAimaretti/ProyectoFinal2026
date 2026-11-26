import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExchangeRateModule } from '../../integrations/exchange-rate/exchange-rate.module';
import { GetUsdOfficialUseCase } from '../../integrations/exchange-rate/application/use-cases/get-usd-official.use-case';
import { PaymentController } from './adapters/inbound/payment.controller';
import { PrismaPaymentAdapter } from './adapters/outbound/prisma-payment.adapter';
import {
  PAYMENT_INVOICE_READER,
  PAYMENT_REPOSITORY,
  PAYMENT_TENANT_READER,
  PaymentInvoiceReaderPort,
  PaymentRepositoryPort,
  PaymentTenantReaderPort,
} from './application/payment.ports';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case';
import { FindPaymentUseCase } from './application/use-cases/find-payment.use-case';
import { ListPaymentsUseCase } from './application/use-cases/list-payments.use-case';

@Module({
  imports: [PrismaModule, ExchangeRateModule],
  controllers: [PaymentController],
  providers: [
    PrismaPaymentAdapter,
    { provide: PAYMENT_REPOSITORY, useExisting: PrismaPaymentAdapter },
    { provide: PAYMENT_INVOICE_READER, useExisting: PrismaPaymentAdapter },
    { provide: PAYMENT_TENANT_READER, useExisting: PrismaPaymentAdapter },
    {
      provide: CreatePaymentUseCase,
      useFactory: (
        repository: PaymentRepositoryPort,
        invoices: PaymentInvoiceReaderPort,
        tenants: PaymentTenantReaderPort,
        rates: GetUsdOfficialUseCase,
      ) => new CreatePaymentUseCase(repository, invoices, tenants, rates),
      inject: [
        PAYMENT_REPOSITORY,
        PAYMENT_INVOICE_READER,
        PAYMENT_TENANT_READER,
        GetUsdOfficialUseCase,
      ],
    },
    {
      provide: FindPaymentUseCase,
      useFactory: (repository: PaymentRepositoryPort) =>
        new FindPaymentUseCase(repository),
      inject: [PAYMENT_REPOSITORY],
    },
    {
      provide: ListPaymentsUseCase,
      useFactory: (repository: PaymentRepositoryPort) =>
        new ListPaymentsUseCase(repository),
      inject: [PAYMENT_REPOSITORY],
    },
  ],
})
export class PaymentModule {}
