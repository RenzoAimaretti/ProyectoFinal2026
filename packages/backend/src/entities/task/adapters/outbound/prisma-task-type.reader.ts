import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TaskTypeReaderPort } from '../../application/task.ports';

@Injectable()
export class PrismaTaskTypeReader implements TaskTypeReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForCompany(id: string, companyId: string) {
    return this.prisma.taskType.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
  }
}
