import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LotReaderPort } from '../../application/livestock.ports';

@Injectable()
export class PrismaLotReader implements LotReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
  ): Promise<{ id: string; companyId: string } | null> {
    const lot = await this.prisma.lot.findUnique({
      where: { id },
      select: { id: true, farm: { select: { companyId: true } } },
    });

    if (!lot?.farm?.companyId) {
      return null;
    }

    return { id: lot.id, companyId: lot.farm.companyId };
  }
}
