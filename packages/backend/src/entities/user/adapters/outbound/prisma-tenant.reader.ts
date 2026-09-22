import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TenantReaderPort } from '../../application/user.ports';

@Injectable()
export class PrismaTenantReader implements TenantReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    }) as Promise<{ id: string } | null>;
  }
}
