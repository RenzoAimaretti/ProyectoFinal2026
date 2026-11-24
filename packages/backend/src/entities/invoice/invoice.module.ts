import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoiceController } from './adapters/inbound/invoice.controller';
import { PrismaInvoiceRepository } from './adapters/outbound/prisma-invoice.repository';
import {
  PrismaInvoiceClientReader,
  PrismaInvoiceCompanyReader,
  PrismaInvoiceTaskReader,
} from './adapters/outbound/prisma-invoice.readers';
import { InvoiceSystemClock } from './adapters/outbound/system-clock';
import {
  INVOICE_CLIENT_READER,
  INVOICE_CLOCK,
  INVOICE_COMPANY_READER,
  INVOICE_REPOSITORY,
  INVOICE_TASK_READER,
  InvoiceClientReaderPort,
  InvoiceClockPort,
  InvoiceCompanyReaderPort,
  InvoiceRepositoryPort,
  InvoiceTaskReaderPort,
} from './application/invoice.ports';
import { CreateInvoiceUseCase } from './application/use-cases/create-invoice.use-case';
import { FindInvoiceUseCase } from './application/use-cases/find-invoice.use-case';
import { ListInvoicesUseCase } from './application/use-cases/list-invoices.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [InvoiceController],
  providers: [
    PrismaInvoiceRepository,
    PrismaInvoiceCompanyReader,
    PrismaInvoiceClientReader,
    PrismaInvoiceTaskReader,
    InvoiceSystemClock,
    { provide: INVOICE_REPOSITORY, useExisting: PrismaInvoiceRepository },
    {
      provide: INVOICE_COMPANY_READER,
      useExisting: PrismaInvoiceCompanyReader,
    },
    { provide: INVOICE_CLIENT_READER, useExisting: PrismaInvoiceClientReader },
    { provide: INVOICE_TASK_READER, useExisting: PrismaInvoiceTaskReader },
    { provide: INVOICE_CLOCK, useExisting: InvoiceSystemClock },
    {
      provide: CreateInvoiceUseCase,
      useFactory: (
        repository: InvoiceRepositoryPort,
        companies: InvoiceCompanyReaderPort,
        clients: InvoiceClientReaderPort,
        tasks: InvoiceTaskReaderPort,
        clock: InvoiceClockPort,
      ) =>
        new CreateInvoiceUseCase(repository, companies, clients, tasks, clock),
      inject: [
        INVOICE_REPOSITORY,
        INVOICE_COMPANY_READER,
        INVOICE_CLIENT_READER,
        INVOICE_TASK_READER,
        INVOICE_CLOCK,
      ],
    },
    {
      provide: FindInvoiceUseCase,
      useFactory: (repository: InvoiceRepositoryPort) =>
        new FindInvoiceUseCase(repository),
      inject: [INVOICE_REPOSITORY],
    },
    {
      provide: ListInvoicesUseCase,
      useFactory: (repository: InvoiceRepositoryPort) =>
        new ListInvoicesUseCase(repository),
      inject: [INVOICE_REPOSITORY],
    },
  ],
})
export class InvoiceModule {}
