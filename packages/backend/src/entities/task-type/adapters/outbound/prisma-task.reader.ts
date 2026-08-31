import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TaskLookupRecord } from '../../application/task-type.types';
import { TaskReaderPort } from '../../application/task-type.ports';

@Injectable()
export class PrismaTaskReader implements TaskReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdsForCompany(ids: string[], companyId: string): Promise<TaskLookupRecord[]> {
    return this.prisma.task.findMany({
      where: { id: { in: ids }, taskType: { companyId } },
      select: { id: true },
    });
  }
}
