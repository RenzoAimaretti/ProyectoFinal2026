import { EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import {
  ExpenseChanges,
  applyChanges,
  parseExpenseChanges,
} from '../../domain/expense.rules';
import { ExpenseSuggestionOutput } from '../dto/expense.output';
import { assertChangedReferences, valuesOf } from '../expense-support';
import { ExpenseCategoryReaderPort } from '../ports/expense-category-reader.port';
import { ExpenseRepositoryPort } from '../ports/expense-repository.port';
import { ExpenseSuggestionRepositoryPort } from '../ports/expense-suggestion-repository.port';
import { LotReaderPort } from '../ports/lot-reader.port';

export interface CreateExpenseSuggestionInput {
  companyId: string;
  tenantId: string;
  userId: string;
  expenseId: string;
  /** Crudo: `kind` mas, en una EDICION, los valores propuestos. */
  body: unknown;
}

/** A SUPERVISOR proposes an edit or a removal; the ADMIN decides. */
export class CreateExpenseSuggestionUseCase {
  constructor(
    private readonly expenses: ExpenseRepositoryPort,
    private readonly suggestions: ExpenseSuggestionRepositoryPort,
    private readonly lots: LotReaderPort,
    private readonly categories: ExpenseCategoryReaderPort,
  ) {}

  async execute(
    input: CreateExpenseSuggestionInput,
  ): Promise<ExpenseSuggestionOutput> {
    const body =
      input.body && typeof input.body === 'object'
        ? (input.body as Record<string, unknown>)
        : {};
    const kind = body.kind;
    if (kind !== 'EDICION' && kind !== 'BAJA') {
      throw new InvalidInputError('kind debe ser EDICION o BAJA');
    }

    // Only an EDICION carries values; they are validated before any read.
    const proposed: ExpenseChanges | null =
      kind === 'EDICION' ? parseExpenseChanges(body) : null;

    const expense = await this.expenses.findById(
      input.expenseId,
      input.companyId,
    );
    if (!expense) throw new EntityNotFoundError('Expense not found');

    if (proposed) {
      const current = valuesOf(expense);
      // The merged Money must be valid on its own (e.g. kilos need a grain).
      applyChanges(current, proposed);
      await assertChangedReferences(
        proposed,
        current,
        this.lots,
        this.categories,
        input.tenantId,
      );
    }

    return this.suggestions.create({
      expenseId: expense.id,
      companyId: input.companyId,
      kind: kind,
      proposed,
      suggestedBy: input.userId,
    });
  }
}
