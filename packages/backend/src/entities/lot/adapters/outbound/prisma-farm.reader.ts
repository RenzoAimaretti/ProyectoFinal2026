import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { FarmReaderPort } from '../../application/lot.ports';

@Injectable()
export class PrismaFarmReader implements FarmReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.farm.findFirst({
      where: { id, client: { tenantId } },
      select: { id: true },
    });
  }
}
