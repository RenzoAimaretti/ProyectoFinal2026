import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TaskLookupRecord } from '../../application/task-type.types';
import { TaskReaderPort } from '../../application/task-type.ports';

@Injectable()
export class PrismaTaskReader implements TaskReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIds(ids: string[]): Promise<TaskLookupRecord[]> {
    return this.prisma.task.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
  }
}
