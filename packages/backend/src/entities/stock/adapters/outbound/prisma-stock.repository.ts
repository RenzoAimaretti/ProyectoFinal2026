import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StockRepositoryPort } from '../../application/stock.ports';
import { StockRecord } from '../../application/stock.types';

@Injectable()
export class PrismaStockRepository implements StockRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByClient(clientId: string): Promise<StockRecord[]> {
    return this.prisma.stock.findMany({
      where: { clientId },
      orderBy: [{ inputId: 'asc' }],
    });
  }

  findByClientAndInput(
    clientId: string,
    inputId: string,
  ): Promise<StockRecord | null> {
    return this.prisma.stock.findFirst({ where: { clientId, inputId } });
  }
}
