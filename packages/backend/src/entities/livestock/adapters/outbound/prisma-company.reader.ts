import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CompanyReaderPort } from '../../application/livestock.ports';

@Injectable()
export class PrismaCompanyReader implements CompanyReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      select: { id: true },
    });
  }
}
