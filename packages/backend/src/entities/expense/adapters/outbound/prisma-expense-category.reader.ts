import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ExpenseCategoryReaderPort } from '../../application/ports/expense-category-reader.port';

@Injectable()
export class PrismaExpenseCategoryReader implements ExpenseCategoryReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  findInTenant(
    categoryId: string,
    tenantId: string,
  ): Promise<{ id: string; active: boolean } | null> {
    return this.prisma.expenseCategory.findFirst({
      where: { id: categoryId, tenantId },
      select: { id: true, active: true },
    });
  }
}
