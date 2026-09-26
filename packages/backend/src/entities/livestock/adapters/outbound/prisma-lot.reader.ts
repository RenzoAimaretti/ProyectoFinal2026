import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LotReaderPort } from '../../application/livestock.ports';

@Injectable()
export class PrismaLotReader implements LotReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForCompany(id: string, companyId: string): Promise<{ id: string } | null> {
    return this.prisma.lot.findFirst({
      where: {
        id,
        farm: { client: { tenant: { companies: { some: { id: companyId } } } } },
      },
      select: { id: true },
    });
  }
}
