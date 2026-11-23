import { EntityNotFoundError } from '../../domain/errors';
import {
  applyChanges,
  assertNoPendingSuggestion,
  parseExpenseChanges,
} from '../../domain/expense.rules';
import { ExpenseOutput } from '../dto/expense.output';
import {
  assertChangedReferences,
  revalueIfNeeded,
  valuesOf,
} from '../expense-support';
import { ClockPort } from '../ports/clock.port';
import { ExpenseCategoryReaderPort } from '../ports/expense-category-reader.port';
import { ExpenseRepositoryPort } from '../ports/expense-repository.port';
import { LotReaderPort } from '../ports/lot-reader.port';
import { MoneyValuationPort } from '../ports/money-valuation.port';

export interface UpdateExpenseInput {
  companyId: string;
  tenantId: string;
  userId: string;
  id: string;
  /** Crudo: edicion parcial; la firma nunca viaja en el body. */
  body: unknown;
}

/** Direct edit by the ADMIN. A pending suggestion must be resolved first. */
export class UpdateExpenseUseCase {
  constructor(
    private readonly expenses: ExpenseRepositoryPort,
    private readonly lots: LotReaderPort,
    private readonly categories: ExpenseCategoryReaderPort,
    private readonly valuation: MoneyValuationPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: UpdateExpenseInput): Promise<ExpenseOutput> {
    const changes = parseExpenseChanges(input.body);

    const expense = await this.expenses.findById(input.id, input.companyId);
    if (!expense) throw new EntityNotFoundError('Expense not found');

    // Early answer; the adapter checks it again inside its transaction.
    assertNoPendingSuggestion(expense.pendingSuggestionId !== null);

    const current = valuesOf(expense);
    const next = applyChanges(current, changes);
    await assertChangedReferences(
      changes,
      current,
      this.lots,
      this.categories,
      input.tenantId,
    );

    const revaluation = await revalueIfNeeded(
      current.money,
      next.money,
      this.valuation,
      this.clock,
    );

    return this.expenses.updateDirect({
      id: expense.id,
      companyId: input.companyId,
      userId: input.userId,
      expectedUpdatedAt: expense.updatedAt,
      lotId: next.lotId,
      categoryId: next.categoryId,
      date: next.date,
      description: next.description,
      revaluation,
    });
  }
}
