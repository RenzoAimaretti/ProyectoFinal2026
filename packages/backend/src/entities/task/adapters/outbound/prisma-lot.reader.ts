import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LotReaderPort } from '../../application/task.ports';

@Injectable()
export class PrismaLotReader implements LotReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.lot.findUnique({ where: { id }, select: { id: true } });
  }
}
