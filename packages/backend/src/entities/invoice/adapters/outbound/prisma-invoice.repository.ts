import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { InvoiceRepositoryPort } from '../../application/invoice.ports';
import {
  CreateInvoiceData,
  InvoiceRecord,
} from '../../application/invoice.types';
import { DuplicateEntityError } from '../../domain/errors';

const include = { items: { orderBy: { id: 'asc' as const } } };
type InvoiceRow = NonNullable<
  Awaited<ReturnType<PrismaInvoiceRepository['findRow']>>
>;

@Injectable()
export class PrismaInvoiceRepository implements InvoiceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findRow(id: string, companyId: string) {
    return this.prisma.invoice.findFirst({
      where: { id, companyId, deleted: false },
      include,
    });
  }

  private map(row: InvoiceRow): InvoiceRecord {
    return {
      id: row.id,
      companyId: row.companyId,
      clientId: row.clientId,
      number: row.number,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      status: row.status,
      usdRate: row.usdRate,
      usdRateDate: row.usdRateDate,
      totalAmount: row.totalAmount,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
      deleted: row.deleted,
      items: row.items.map((item) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        taskId: item.taskId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
    };
  }

  async create(data: CreateInvoiceData): Promise<InvoiceRecord> {
    try {
      const row = await this.prisma.invoice.create({
        data: {
          companyId: data.companyId,
          clientId: data.clientId,
          number: data.number,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          status: data.status,
          totalAmount: data.totalAmount,
          notes: data.notes,
          items: {
            create: data.items.map((item) => ({
              taskId: item.taskId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
            })),
          },
        },
        include,
      });
      return this.map(row);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DuplicateEntityError(
          'Invoice number already exists for this company',
        );
      }
      throw error;
    }
  }

  async findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<InvoiceRecord | null> {
    const row = await this.findRow(id, companyId);
    return row ? this.map(row) : null;
  }

  async findAllByCompany(companyId: string): Promise<InvoiceRecord[]> {
    const rows = await this.prisma.invoice.findMany({
      where: { companyId, deleted: false },
      include,
      orderBy: [{ issueDate: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.map(row));
  }
}
