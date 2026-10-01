import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DailyReportCompanyReaderPort } from '../../application/daily-report.ports';

@Injectable()
export class PrismaDailyReportCompanyReader
  implements DailyReportCompanyReaderPort
{
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      select: { id: true, tenantId: true },
    });
  }
}
