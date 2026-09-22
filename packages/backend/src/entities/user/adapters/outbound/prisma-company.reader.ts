import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CompanyReaderPort } from '../../application/user.ports';

@Injectable()
export class PrismaCompanyReader implements CompanyReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForTenant(id: string, tenantId: string) {
    return this.prisma.company.findFirst({
      where: { id, tenantId },
      select: { id: true },
    }) as Promise<{ id: string } | null>;
  }
}
