import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ExpenseSuggestionOutput } from '../../application/dto/expense.output';
import {
  ApproveSuggestionRecord,
  CreateSuggestionRecord,
  ExpenseSuggestionRepositoryPort,
  RejectSuggestionRecord,
  SuggestionFilter,
} from '../../application/ports/expense-suggestion-repository.port';
import {
  ConcurrentModificationError,
  EntityNotFoundError,
} from '../../domain/errors';
import {
  assertNoPendingSuggestion,
  assertPendingSuggestion,
} from '../../domain/expense.rules';
import { revaluationData, toSuggestionOutput } from './expense.mapper';
import { TransactionClient, runSerializable } from './serializable-transaction';

const WITH_EXPENSE = { expense: true } as const;

@Injectable()
export class PrismaExpenseSuggestionRepository implements ExpenseSuggestionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  create(record: CreateSuggestionRecord): Promise<ExpenseSuggestionOutput> {
    return runSerializable(this.prisma, async (tx) => {
      const expense = await tx.expense.findFirst({
        where: {
          id: record.expenseId,
          companyId: record.companyId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!expense) throw new EntityNotFoundError('Expense not found');

      const pending = await tx.expenseSuggestion.findFirst({
        where: { expenseId: record.expenseId, status: 'PENDIENTE' },
        select: { id: true },
      });
      assertNoPendingSuggestion(pending !== null);

      const p = record.proposed;
      const row = await tx.expenseSuggestion.create({
        data: {
          expenseId: record.expenseId,
          companyId: record.companyId,
          kind: record.kind,
          proposedLotId: p?.lotId ?? null,
          proposedCategoryId: p?.categoryId ?? null,
          proposedDate: p?.date ?? null,
          proposedDescription: p?.description ?? null,
          proposedAmount: p?.amount ? p.amount.toString() : null,
          proposedUnit: p?.unit ?? null,
          proposedGrain: p?.grain ?? null,
          suggestedBy: record.suggestedBy,
        },
        include: WITH_EXPENSE,
      });
      return toSuggestionOutput(row);
    });
  }

  async findAll(filter: SuggestionFilter): Promise<ExpenseSuggestionOutput[]> {
    const rows = await this.prisma.expenseSuggestion.findMany({
      where: {
        companyId: filter.companyId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.suggestedBy ? { suggestedBy: filter.suggestedBy } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: WITH_EXPENSE,
    });
    return rows.map(toSuggestionOutput);
  }

  async findById(
    id: string,
    companyId: string,
  ): Promise<ExpenseSuggestionOutput | null> {
    const row = await this.prisma.expenseSuggestion.findFirst({
      where: { id, companyId },
      include: WITH_EXPENSE,
    });
    return row ? toSuggestionOutput(row) : null;
  }

  approve(record: ApproveSuggestionRecord): Promise<ExpenseSuggestionOutput> {
    return runSerializable(this.prisma, async (tx) => {
      const suggestion = await this.loadPending(
        tx,
        record.id,
        record.companyId,
      );

      const expense = await tx.expense.findFirst({
        where: {
          id: suggestion.expenseId,
          companyId: record.companyId,
          deletedAt: null,
        },
      });
      if (!expense) throw new EntityNotFoundError('Expense not found');

      const { apply } = record;
      if (apply.kind === 'BAJA') {
        // Soft delete: the suggestion keeps its history and stays visible.
        await tx.expense.update({
          where: { id: expense.id },
          data: {
            deletedAt: record.resolvedAt,
            deletedBy: record.resolvedBy,
            updatedBy: record.resolvedBy,
          },
        });
      } else {
        if (expense.updatedAt.getTime() !== apply.expectedUpdatedAt.getTime()) {
          throw new ConcurrentModificationError(
            'El gasto cambió mientras se aprobaba: reintentá',
          );
        }
        await tx.expense.update({
          where: { id: expense.id },
          data: {
            lotId: apply.lotId,
            categoryId: apply.categoryId,
            date: apply.date,
            description: apply.description,
            updatedBy: record.resolvedBy,
            ...(apply.revaluation ? revaluationData(apply.revaluation) : {}),
          },
        });
      }

      const resolved = await tx.expenseSuggestion.update({
        where: { id: record.id },
        data: {
          status: 'APROBADA',
          resolvedBy: record.resolvedBy,
          resolvedAt: record.resolvedAt,
        },
        include: WITH_EXPENSE,
      });
      return toSuggestionOutput(resolved);
    });
  }

  reject(record: RejectSuggestionRecord): Promise<ExpenseSuggestionOutput> {
    return runSerializable(this.prisma, async (tx) => {
      await this.loadPending(tx, record.id, record.companyId);

      const resolved = await tx.expenseSuggestion.update({
        where: { id: record.id },
        data: {
          status: 'RECHAZADA',
          rejectionReason: record.reason,
          resolvedBy: record.resolvedBy,
          resolvedAt: record.resolvedAt,
        },
        include: WITH_EXPENSE,
      });
      return toSuggestionOutput(resolved);
    });
  }

  /** The suggestion of the firma, still PENDIENTE inside the transaction. */
  private async loadPending(
    tx: TransactionClient,
    id: string,
    companyId: string,
  ) {
    const suggestion = await tx.expenseSuggestion.findFirst({
      where: { id, companyId },
    });
    if (!suggestion) throw new EntityNotFoundError('Suggestion not found');
    assertPendingSuggestion(suggestion.status);
    return suggestion;
  }
}
