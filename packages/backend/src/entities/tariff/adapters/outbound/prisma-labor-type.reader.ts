import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  LaborTypeReaderPort,
  LaborTypeSummary,
} from '../../application/ports/labor-type-reader.port';

@Injectable()
export class PrismaLaborTypeReader implements LaborTypeReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  /** Solo tipos de labor del tenant del caller y no dados de baja. */
  findActiveInTenant(
    laborTypeId: string,
    tenantId: string,
  ): Promise<LaborTypeSummary | null> {
    return this.prisma.laborType.findFirst({
      where: { id: laborTypeId, tenantId, deleted: false },
      select: { id: true, name: true },
    });
  }
}
