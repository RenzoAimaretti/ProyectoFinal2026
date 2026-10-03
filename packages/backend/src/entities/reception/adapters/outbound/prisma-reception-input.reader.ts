import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ReceptionCatalogueInput,
  ReceptionInputReaderPort,
} from '../../application/reception.ports';

@Injectable()
export class PrismaReceptionInputReader implements ReceptionInputReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findExistingForTenant(
    inputIds: string[],
    tenantId: string,
  ): Promise<ReceptionCatalogueInput[]> {
    return this.prisma.input.findMany({
      where: { id: { in: inputIds }, tenantId },
      select: { id: true, unit: true },
    });
  }
}
