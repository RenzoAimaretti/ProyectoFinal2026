import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DailyReportClientReaderPort } from '../../application/daily-report.ports';

/**
 * The client that owns the stock is reached through the farm of the worked lot.
 * The firm of the report is not involved in the stock scope (R017).
 */
@Injectable()
export class PrismaDailyReportClientReader
  implements DailyReportClientReaderPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findClientIdByLotId(lotId: string): Promise<string | null> {
    const lot = await this.prisma.lot.findFirst({
      where: { id: lotId },
      select: { farm: { select: { clientId: true } } },
    });

    return lot?.farm.clientId ?? null;
  }
}
