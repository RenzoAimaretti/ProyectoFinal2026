import { Dec } from '../../../valuation/domain/decimal';
import { EntityNotFoundError } from '../../domain/errors';
import {
  ExpenseChanges,
  applyChanges,
  assertPendingSuggestion,
} from '../../domain/expense.rules';
import { ExpenseSuggestionOutput } from '../dto/expense.output';
import {
  assertChangedReferences,
  revalueIfNeeded,
  valuesOf,
} from '../expense-support';
import { ClockPort } from '../ports/clock.port';
import { ExpenseCategoryReaderPort } from '../ports/expense-category-reader.port';
import { ExpenseRepositoryPort } from '../ports/expense-repository.port';
import { ExpenseSuggestionRepositoryPort } from '../ports/expense-suggestion-repository.port';
import { LotReaderPort } from '../ports/lot-reader.port';
import { MoneyValuationPort } from '../ports/money-valuation.port';

export interface ApproveExpenseSuggestionInput {
  companyId: string;
  tenantId: string;
  userId: string;
  id: string;
}

export class ApproveExpenseSuggestionUseCase {
  constructor(
    private readonly expenses: ExpenseRepositoryPort,
    private readonly suggestions: ExpenseSuggestionRepositoryPort,
    private readonly lots: LotReaderPort,
    private readonly categories: ExpenseCategoryReaderPort,
    private readonly valuation: MoneyValuationPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(
    input: ApproveExpenseSuggestionInput,
  ): Promise<ExpenseSuggestionOutput> {
    const suggestion = await this.suggestions.findById(
      input.id,
      input.companyId,
    );
    if (!suggestion) throw new EntityNotFoundError('Suggestion not found');
    assertPendingSuggestion(suggestion.status);

    const resolution = {
      id: suggestion.id,
      companyId: input.companyId,
      resolvedBy: input.userId,
      resolvedAt: this.clock.now(),
    };

    if (suggestion.kind === 'BAJA') {
      return this.suggestions.approve({
        ...resolution,
        apply: { kind: 'BAJA' },
      });
    }

    const expense = await this.expenses.findById(
      suggestion.expenseId,
      input.companyId,
    );
    if (!expense) throw new EntityNotFoundError('Expense not found');

    const current = valuesOf(expense);
    const changes = changesOf(suggestion);
    const next = applyChanges(current, changes);
    // Lot and category are checked again: they may have changed since the suggestion.
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

    return this.suggestions.approve({
      ...resolution,
      apply: {
        kind: 'EDICION',
        expectedUpdatedAt: expense.updatedAt,
        lotId: next.lotId,
        categoryId: next.categoryId,
        date: next.date,
        description: next.description,
        revaluation,
      },
    });
  }
}

function changesOf(suggestion: ExpenseSuggestionOutput): ExpenseChanges {
  const p = suggestion.proposed;
  const changes: ExpenseChanges = {};
  if (p.lotId !== null) changes.lotId = p.lotId;
  if (p.categoryId !== null) changes.categoryId = p.categoryId;
  if (p.date !== null) changes.date = p.date;
  if (p.description !== null) changes.description = p.description;
  if (p.amount !== null) changes.amount = Dec.parse(p.amount);
  if (p.unit !== null) changes.unit = p.unit;
  if (p.grain !== null) changes.grain = p.grain;
  return changes;
}
