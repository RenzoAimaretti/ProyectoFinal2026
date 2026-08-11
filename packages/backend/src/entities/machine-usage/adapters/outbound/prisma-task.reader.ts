import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TaskReaderPort } from '../../application/machine-usage.ports';

@Injectable()
export class PrismaTaskReader implements TaskReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdWithOperators(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        operators: { select: { id: true } },
      },
    });
  }
}
