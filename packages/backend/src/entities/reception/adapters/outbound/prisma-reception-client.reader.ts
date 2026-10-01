import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ReceptionClientReaderPort } from '../../application/reception.ports';

@Injectable()
export class PrismaReceptionClientReader implements ReceptionClientReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.client.findFirst({
      where: { id },
      select: { id: true, tenantId: true },
    });
  }
}
