import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  PaymentInvoiceReaderPort,
  PaymentRepositoryPort,
  PaymentTenantReaderPort,
} from '../../application/payment.ports';
import {
  CreatePaymentData,
  InvoiceScope,
  PaymentKind,
  PaymentRecord,
} from '../../application/payment.types';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';

@Injectable()
export class PrismaPaymentAdapter
  implements
    PaymentRepositoryPort,
    PaymentInvoiceReaderPort,
    PaymentTenantReaderPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findCompanyTenantId(companyId: string): Promise<string | null> {
    const row = await this.prisma.company.findFirst({
      where: { id: companyId, deleted: false },
      select: { tenantId: true },
    });
    return row?.tenantId ?? null;
  }

  async findClientTenantId(clientId: string): Promise<string | null> {
    const row = await this.prisma.client.findFirst({
      where: { id: clientId, deleted: false },
      select: { tenantId: true },
    });
    return row?.tenantId ?? null;
  }

  async findForCompany(
    id: string,
    companyId: string,
  ): Promise<InvoiceScope | null> {
    return this.prisma.invoice.findFirst({
      where: { id, companyId, deleted: false },
      select: { clientId: true, status: true },
    });
  }

  async createAndSettle(data: CreatePaymentData): Promise<PaymentRecord> {
    // As in the daily-report approval adapter, the feature port owns a single transaction
    // across tables: payment and conditional invoice settlement must not diverge.
    // Do not modify or call the invoice module's repository from this payment adapter.
    return this.prisma.$transaction(async (tx) => {
      if (data.invoiceId) {
        // Two concurrent payments must not both aggregate without seeing each
        // other: under READ COMMITTED each would miss the other's uncommitted
        // row, both would fall short, and the invoice would stay EMITIDA after
        // its total was covered. Locking the invoice row serialises the
        // settlement without depending on a retry loop.
        await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${data.invoiceId} FOR UPDATE`;

        const invoice = await tx.invoice.findFirst({
          where: {
            id: data.invoiceId,
            companyId: data.companyId,
            deleted: false,
          },
          select: { clientId: true, status: true, totalAmount: true },
        });
        if (!invoice) throw new EntityNotFoundError('Invoice not found');
        if (invoice.status === 'ANULADA')
          throw new InvalidInputError('Cannot pay an annulled invoice');
        if (invoice.clientId !== data.clientId)
          throw new InvalidRelationError(
            'Invoice must belong to the payment client',
          );
        const payment = await tx.payment.create({ data });
        if (invoice.status === 'EMITIDA') {
          const total = await tx.payment.aggregate({
            where: { invoiceId: data.invoiceId, companyId: data.companyId },
            _sum: { amount: true },
          });
          if ((total._sum.amount ?? 0) >= invoice.totalAmount) {
            const updated = await tx.invoice.updateMany({
              where: {
                id: data.invoiceId,
                companyId: data.companyId,
                status: 'EMITIDA',
              },
              data: { status: 'COBRADA' },
            });
            if (!updated.count)
              throw new InvalidInputError(
                'Invoice status changed during payment',
              );
          }
        }
        return payment;
      }
      return tx.payment.create({ data });
    });
  }

  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<PaymentRecord | null> {
    return this.prisma.payment.findFirst({ where: { id, companyId } });
  }

  findAllByCompany(
    companyId: string,
    kind?: PaymentKind,
  ): Promise<PaymentRecord[]> {
    return this.prisma.payment.findMany({
      where: { companyId, ...(kind ? { kind } : {}) },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });
  }
}
