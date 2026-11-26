import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LotReaderPort } from '../../application/ports/lot-reader.port';

@Injectable()
export class PrismaLotReader implements LotReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findInTenant(
    lotId: string,
    tenantId: string,
  ): Promise<{ id: string } | null> {
    // The tenant is reached through lot -> farm -> client; a lot of another
    // tenant simply does not match.
    return this.prisma.lot.findFirst({
      where: { id: lotId, deleted: false, farm: { client: { tenantId } } },
      select: { id: true },
    });
  }
}
