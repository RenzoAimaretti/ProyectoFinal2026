import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  DailyReportTaskReaderPort,
  DailyReportTaskRecord,
} from '../../application/daily-report.ports';

@Injectable()
export class PrismaDailyReportTaskReader
  implements DailyReportTaskReaderPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findByIdWithScope(id: string): Promise<DailyReportTaskRecord | null> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        lotId: true,
        taskTypeId: true,
        lot: {
          select: {
            farm: { select: { client: { select: { tenantId: true } } } },
          },
        },
      },
    });

    if (!task) {
      return null;
    }

    return {
      id: task.id,
      lotId: task.lotId,
      taskTypeId: task.taskTypeId,
      tenantId: task.lot.farm.client.tenantId,
    };
  }
}
