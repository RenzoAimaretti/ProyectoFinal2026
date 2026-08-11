import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MachineReaderPort } from '../../application/machine-usage.ports';

@Injectable()
export class PrismaMachineReader implements MachineReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.machine.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
  }
}
