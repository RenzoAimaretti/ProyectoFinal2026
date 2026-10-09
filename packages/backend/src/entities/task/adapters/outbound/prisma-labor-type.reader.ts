import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LaborTypeReaderPort } from '../../application/task.ports';

@Injectable()
export class PrismaLaborTypeReader implements LaborTypeReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForTenant(id: string, tenantId: string) {
    return this.prisma.laborType.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
  }
}
