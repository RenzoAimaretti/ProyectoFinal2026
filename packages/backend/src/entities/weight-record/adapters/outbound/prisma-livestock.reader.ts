import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LivestockReaderPort } from '../../application/weight-record.ports';

@Injectable()
export class PrismaLivestockReader implements LivestockReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<{ id: string } | null> {
    return this.prisma.livestock.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  findByIdForCompany(id: string, companyId: string): Promise<{ id: string } | null> {
    return this.prisma.livestock.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
  }
}
