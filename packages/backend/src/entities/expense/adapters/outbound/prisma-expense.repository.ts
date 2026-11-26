import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ExpenseOutput } from '../../application/dto/expense.output';
import {
  CreateExpenseRecord,
  DeleteExpenseRecord,
  ExpenseRepositoryPort,
  UpdateExpenseRecord,
} from '../../application/ports/expense-repository.port';
import {
  ConcurrentModificationError,
  EntityNotFoundError,
} from '../../domain/errors';
import {
  ExpenseFilters,
  assertNoPendingSuggestion,
} from '../../domain/expense.rules';
import {
  WITH_PENDING_SUGGESTION,
  revaluationData,
  toExpenseOutput,
} from './expense.mapper';
import { TransactionClient, runSerializable } from './serializable-transaction';

@Injectable()
export class PrismaExpenseRepository implements ExpenseRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(record: CreateExpenseRecord): Promise<ExpenseOutput> {
    const { money, valuation } = record;
    const row = await this.prisma.expense.create({
      data: {
        companyId: record.companyId,
        lotId: record.lotId,
        categoryId: record.categoryId,
        date: record.date,
        description: record.description,
        amount: money.amount.toString(),
        unit: money.unit,
        grain: money.grain,
        grainArsPerTon: valuation.grainArsPerTon,
        usdRate: valuation.usdRate,
        usdRateType: valuation.usdRateType,
        priceSource: valuation.priceSource,
        priceFetchedAt: valuation.priceFetchedAt,
        priceStale: valuation.priceStale,
        amountArs: valuation.amountArs,
        valuedAt: record.valuedAt,
        createdBy: record.userId,
        updatedBy: record.userId,
      },
      include: WITH_PENDING_SUGGESTION,
    });
    return toExpenseOutput(row);
  }

  async findAll(
    companyId: string,
    filters: ExpenseFilters,
  ): Promise<ExpenseOutput[]> {
    const rows = await this.prisma.expense.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(filters.lotId ? { lotId: filters.lotId } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.from || filters.to
          ? {
              date: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: WITH_PENDING_SUGGESTION,
    });
    return rows.map(toExpenseOutput);
  }

  async findById(id: string, companyId: string): Promise<ExpenseOutput | null> {
    const row = await this.prisma.expense.findFirst({
      where: { id, companyId, deletedAt: null },
      include: WITH_PENDING_SUGGESTION,
    });
    return row ? toExpenseOutput(row) : null;
  }

  updateDirect(record: UpdateExpenseRecord): Promise<ExpenseOutput> {
    return runSerializable(this.prisma, async (tx) => {
      await this.assertEditable(tx, record);

      const row = await tx.expense.update({
        where: { id: record.id },
        data: {
          lotId: record.lotId,
          categoryId: record.categoryId,
          date: record.date,
          description: record.description,
          // `updatedBy` is always saved; the money columns only when revaluing.
          updatedBy: record.userId,
          ...(record.revaluation ? revaluationData(record.revaluation) : {}),
        },
        include: WITH_PENDING_SUGGESTION,
      });
      return toExpenseOutput(row);
    });
  }

  async softDelete(record: DeleteExpenseRecord): Promise<void> {
    await runSerializable(this.prisma, async (tx) => {
      await this.assertEditable(tx, record);

      await tx.expense.update({
        where: { id: record.id },
        data: {
          deletedAt: record.deletedAt,
          deletedBy: record.userId,
          updatedBy: record.userId,
        },
      });
    });
  }

  /** Live, unchanged since it was read, and without a pending suggestion. */
  private async assertEditable(
    tx: TransactionClient,
    record: {
      id: string;
      companyId: string;
      expectedUpdatedAt: Date;
    },
  ): Promise<void> {
    const current = await tx.expense.findFirst({
      where: { id: record.id, companyId: record.companyId, deletedAt: null },
    });
    if (!current) throw new EntityNotFoundError('Expense not found');

    if (current.updatedAt.getTime() !== record.expectedUpdatedAt.getTime()) {
      throw new ConcurrentModificationError(
        'El gasto cambió mientras lo editabas: reintentá',
      );
    }

    const pending = await tx.expenseSuggestion.findFirst({
      where: { expenseId: record.id, status: 'PENDIENTE' },
      select: { id: true },
    });
    assertNoPendingSuggestion(pending !== null);
  }
}
