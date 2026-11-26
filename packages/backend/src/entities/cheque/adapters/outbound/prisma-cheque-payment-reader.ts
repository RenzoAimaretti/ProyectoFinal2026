import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ChequePaymentReaderPort } from '../../application/cheque.ports';

@Injectable()
export class PrismaChequePaymentReader implements ChequePaymentReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async findMethodForCompany(
    id: string,
    companyId: string,
  ): Promise<string | null> {
    // Both independent FKs must resolve within the caller's firma.
    const payment = await this.prisma.payment.findFirst({
      where: { id, companyId },
      select: { method: true },
    });
    return payment?.method ?? null;
  }
}
