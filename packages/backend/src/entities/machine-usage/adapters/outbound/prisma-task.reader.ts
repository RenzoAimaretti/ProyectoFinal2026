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

  findByIdWithOperatorsForCompany(id: string, companyId: string) {
    return this.prisma.task.findFirst({
      where: {
        id,
        lot: {
          farm: {
            companyId,
          },
        },
      },
      select: {
        id: true,
        operators: { select: { id: true } },
      },
    });
  }
}
