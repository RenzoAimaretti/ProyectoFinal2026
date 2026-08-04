import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { LOT_LOOKUP, LotLookupPort } from '../../../ports/lot-lookup.port';

// Adapter delgado de capacidad (D1 Option A, T-F1-06): lectura de lote+farm para
// validar pertenencia a empresa. Reemplazable por LOT_REPOSITORY en F2/W2 (T-F2-23).
@Injectable()
export class PrismaLotLookup implements LotLookupPort {
  constructor(private readonly prisma: PrismaService) {}

  async findLotWithFarm(id: string): Promise<{ id: string; farm: { companyId: string } } | null> {
    const lot = await this.prisma.lot.findUnique({
      where: { id },
      select: { id: true, farm: { select: { companyId: true } } },
    });
    return lot;
  }
}
