import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TaskTypeReaderPort } from '../../application/task.ports';

@Injectable()
export class PrismaTaskTypeReader implements TaskTypeReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForTenant(id: string, tenantId: string) {
    return this.prisma.taskType.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
  }
}
