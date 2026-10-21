import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TaskLookupRecord } from '../../application/labor-type.types';
import { TaskReaderPort } from '../../application/labor-type.ports';

@Injectable()
export class PrismaTaskReader implements TaskReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdsForTenant(ids: string[], tenantId: string): Promise<TaskLookupRecord[]> {
    return this.prisma.task.findMany({
      where: { id: { in: ids }, laborType: { tenantId } },
      select: { id: true },
    });
  }
}
