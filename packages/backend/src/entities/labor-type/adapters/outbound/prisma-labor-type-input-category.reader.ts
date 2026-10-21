import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LaborTypeInputCategoryReaderPort } from '../../application/labor-type-category.ports';

@Injectable()
export class PrismaLaborTypeInputCategoryReader implements LaborTypeInputCategoryReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findByIdsForTenant(ids: string[], tenantId: string) {
    return this.prisma.inputCategory.findMany({
      where: { id: { in: ids }, tenantId, deleted: false },
      select: { id: true },
    });
  }
}
