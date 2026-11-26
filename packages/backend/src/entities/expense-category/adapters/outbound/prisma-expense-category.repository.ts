import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ExpenseCategoryRepositoryPort } from '../../application/expense-category.ports';
import {
  ExpenseCategoryRecord,
  UpdateExpenseCategoryInput,
} from '../../application/expense-category.types';
import { CategoryInUseError, DuplicateEntityError } from '../../domain/errors';

const UNIQUE_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { code } = error as { code?: unknown };
  return typeof code === 'string' ? code : undefined;
}

const SELECT = {
  id: true,
  tenantId: true,
  name: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PrismaExpenseCategoryRepository implements ExpenseCategoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTenantId(tenantId: string): Promise<ExpenseCategoryRecord[]> {
    return this.prisma.expenseCategory.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<ExpenseCategoryRecord | null> {
    return this.prisma.expenseCategory.findFirst({ where: { id, tenantId } });
  }

  findByNameAndTenantId(
    name: string,
    tenantId: string,
  ): Promise<ExpenseCategoryRecord | null> {
    return this.prisma.expenseCategory.findFirst({
      where: { name, tenantId },
    });
  }

  async create(data: {
    tenantId: string;
    name: string;
  }): Promise<ExpenseCategoryRecord> {
    try {
      return await this.prisma.expenseCategory.create({ data });
    } catch (error) {
      if (errorCode(error) === UNIQUE_VIOLATION) {
        throw new DuplicateEntityError('Expense category already exists');
      }
      throw error;
    }
  }

  async updateForTenant(
    id: string,
    tenantId: string,
    data: UpdateExpenseCategoryInput,
  ): Promise<ExpenseCategoryRecord> {
    try {
      const result = await this.prisma.expenseCategory.updateMany({
        where: { id, tenantId },
        data,
      });
      if (!result.count)
        throw new Error('Expense category not found for tenant');
      return await this.prisma.expenseCategory.findFirstOrThrow({
        where: { id, tenantId },
        select: SELECT,
      });
    } catch (error) {
      if (errorCode(error) === UNIQUE_VIOLATION) {
        throw new DuplicateEntityError('Expense category already exists');
      }
      throw error;
    }
  }

  async deleteForTenant(id: string, tenantId: string): Promise<void> {
    try {
      await this.prisma.expenseCategory.delete({ where: { id, tenantId } });
    } catch (error) {
      // Race: an expense was attached between the check and the delete.
      if (errorCode(error) === FOREIGN_KEY_VIOLATION) {
        throw new CategoryInUseError('Expense category still has expenses');
      }
      throw error;
    }
  }

  async hasExpenses(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.expense.count({
      where: { categoryId: id, category: { tenantId } },
    });
    return count > 0;
  }
}
