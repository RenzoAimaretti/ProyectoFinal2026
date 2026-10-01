import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StockRepositoryPort } from '../../application/stock.ports';
import { StockRecord } from '../../application/stock.types';

/**
 * The list read always joins the catalogue input so the inbound adapter can
 * expose `inputName` and `unit` without an extra round trip.
 */
const STOCK_QUERY_INCLUDE = {
  input: { select: { name: true as const, unit: true as const } },
};

type StockRow = {
  id: string;
  clientId: string;
  inputId: string;
  quantity: number;
  updatedAt: Date;
  input?: { name: string; unit: string } | null;
};

function toStockRecord(stock: StockRow): StockRecord {
  return {
    id: stock.id,
    clientId: stock.clientId,
    inputId: stock.inputId,
    quantity: stock.quantity,
    updatedAt: stock.updatedAt,
    inputName: stock.input?.name,
    unit: stock.input?.unit,
  };
}

@Injectable()
export class PrismaStockRepository implements StockRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByClient(clientId: string): Promise<StockRecord[]> {
    const stocks = await this.prisma.stock.findMany({
      where: { clientId },
      include: STOCK_QUERY_INCLUDE,
      orderBy: [{ inputId: 'asc' }],
    });

    return stocks.map(toStockRecord);
  }

  async findByClientAndInput(
    clientId: string,
    inputId: string,
  ): Promise<StockRecord | null> {
    const stock = await this.prisma.stock.findFirst({
      where: { clientId, inputId },
      include: STOCK_QUERY_INCLUDE,
    });

    return stock ? toStockRecord(stock) : null;
  }
}
