import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UserReaderPort } from '../../application/machine-usage.ports';

@Injectable()
export class PrismaUserReader implements UserReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true } });
  }
}
