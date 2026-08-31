import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { FarmReaderPort } from '../../application/lot.ports';

@Injectable()
export class PrismaFarmReader implements FarmReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForCompany(
    id: string,
    companyId: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.farm.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
  }
}
