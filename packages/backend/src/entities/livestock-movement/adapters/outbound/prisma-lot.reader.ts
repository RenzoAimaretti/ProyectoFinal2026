import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LotReaderPort } from '../../application/livestock-movement.ports';

@Injectable()
export class PrismaLotReader implements LotReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<{ id: string } | null> {
    return this.prisma.lot.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  findByIdForCompany(id: string, companyId: string): Promise<{ id: string } | null> {
    return this.prisma.lot.findFirst({
      where: { id, farm: { companyId } },
      select: { id: true },
    });
  }
}
