import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ClientReaderPort } from '../../application/farm.ports';

@Injectable()
export class PrismaClientReader implements ClientReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForTenant(id: string, tenantId: string) {
    return this.prisma.client.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
  }
}
