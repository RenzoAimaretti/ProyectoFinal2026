import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LaborTypeCategoryRepositoryPort } from '../../application/labor-type-category.ports';

@Injectable()
export class PrismaLaborTypeCategoryRepository implements LaborTypeCategoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findLaborTypeForTenant(id: string, tenantId: string) {
    return this.prisma.laborType.findFirst({ where: { id, tenantId, deleted: false }, select: { id: true } });
  }

  async findCategoriesForLaborType(id: string, tenantId: string) {
    const rows = await this.prisma.laborTypeCategory.findMany({
      where: { laborTypeId: id, laborType: { tenantId }, category: { tenantId, deleted: false } },
      select: { category: true },
      orderBy: { category: { name: 'asc' } },
    });
    return rows.map((row) => row.category);
  }

  async replaceCategoriesForTenant(id: string, tenantId: string, categoryIds: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.laborTypeCategory.deleteMany({ where: { laborTypeId: id, laborType: { tenantId } } });
      if (categoryIds.length) {
        await tx.laborTypeCategory.createMany({
          data: categoryIds.map((categoryId) => ({ laborTypeId: id, categoryId })),
        });
      }
    });
  }
}
