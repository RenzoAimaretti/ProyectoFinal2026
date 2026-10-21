import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { InputCategoryReaderPort } from '../../application/input.ports';

@Injectable()
export class PrismaInputCategoryReader implements InputCategoryReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdForTenant(id: string, tenantId: string): Promise<{ id: string } | null> {
    return this.prisma.inputCategory.findFirst({ where: { id, tenantId }, select: { id: true } });
  }
}
