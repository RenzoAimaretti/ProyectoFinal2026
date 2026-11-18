import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  InvoiceClientReaderPort,
  InvoiceCompanyReaderPort,
  InvoiceTaskReaderPort,
} from '../../application/invoice.ports';

@Injectable()
export class PrismaInvoiceCompanyReader implements InvoiceCompanyReaderPort {
  constructor(private readonly prisma: PrismaService) {}
  async findTenantId(id: string): Promise<string | null> {
    const company = await this.prisma.company.findFirst({
      where: { id, deleted: false },
      select: { tenantId: true },
    });
    return company?.tenantId ?? null;
  }
}
@Injectable()
export class PrismaInvoiceClientReader implements InvoiceClientReaderPort {
  constructor(private readonly prisma: PrismaService) {}
  async findTenantId(id: string): Promise<string | null> {
    const client = await this.prisma.client.findFirst({
      where: { id, deleted: false },
      select: { tenantId: true },
    });
    return client?.tenantId ?? null;
  }
}
@Injectable()
export class PrismaInvoiceTaskReader implements InvoiceTaskReaderPort {
  constructor(private readonly prisma: PrismaService) {}
  async findClientScope(
    id: string,
  ): Promise<{ clientId: string; tenantId: string } | null> {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        deleted: false,
        lot: {
          deleted: false,
          farm: { deleted: false, client: { deleted: false } },
        },
      },
      select: {
        lot: {
          select: {
            farm: {
              select: { client: { select: { id: true, tenantId: true } } },
            },
          },
        },
      },
    });
    return task
      ? {
          clientId: task.lot.farm.client.id,
          tenantId: task.lot.farm.client.tenantId,
        }
      : null;
  }
}
