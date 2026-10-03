import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LotReaderPort } from '../../application/recipe.ports';

@Injectable()
export class PrismaLotReader implements LotReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForTenant(id: string, tenantId: string) {
    return this.prisma.lot.findFirst({
      where: { id, farm: { client: { tenantId } } },
      select: { id: true },
    });
  }
}
