import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TaskTypeReaderPort } from '../../application/task.ports';

@Injectable()
export class PrismaTaskTypeReader implements TaskTypeReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.taskType.findUnique({ where: { id }, select: { id: true } });
  }
}
