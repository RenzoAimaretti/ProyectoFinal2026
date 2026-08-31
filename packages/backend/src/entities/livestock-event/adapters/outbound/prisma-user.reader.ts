import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UserReaderPort } from '../../application/livestock-event.ports';

@Injectable()
export class PrismaUserReader implements UserReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  findByIdForCompany(id: string, companyId: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { id, companyId },
      select: { id: true },
    });
  }
}
