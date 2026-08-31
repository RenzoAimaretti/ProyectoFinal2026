import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LotReaderPort } from '../../application/task.ports';

@Injectable()
export class PrismaLotReader implements LotReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForCompany(id: string, companyId: string) {
    return this.prisma.lot.findFirst({
      where: { id, farm: { companyId } },
      select: { id: true },
    });
  }
}
