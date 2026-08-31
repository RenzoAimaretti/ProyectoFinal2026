import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UserReaderPort } from '../../application/task.ports';

@Injectable()
export class PrismaUserReader implements UserReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForCompany(id: string, companyId: string) {
    return this.prisma.user.findUnique({
      where: { id, companyId },
      select: { id: true, role: true },
    });
  }
}
