import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { InputStockReaderPort } from '../../application/input.ports';

@Injectable()
export class PrismaInputStockReader implements InputStockReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async hasNonZeroBalance(inputId: string): Promise<boolean> {
    const balance = await this.prisma.stock.findFirst({
      where: { inputId, quantity: { not: 0 } },
      select: { id: true },
    });

    return balance !== null;
  }
}
