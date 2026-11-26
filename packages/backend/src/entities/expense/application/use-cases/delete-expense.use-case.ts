import { EntityNotFoundError } from '../../domain/errors';
import { assertNoPendingSuggestion } from '../../domain/expense.rules';
import { ClockPort } from '../ports/clock.port';
import { ExpenseRepositoryPort } from '../ports/expense-repository.port';

export interface DeleteExpenseInput {
  companyId: string;
  userId: string;
  id: string;
}

/** Direct soft delete by the ADMIN: the expense leaves listings and the calculator. */
export class DeleteExpenseUseCase {
  constructor(
    private readonly expenses: ExpenseRepositoryPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: DeleteExpenseInput): Promise<{ message: string }> {
    const expense = await this.expenses.findById(input.id, input.companyId);
    if (!expense) throw new EntityNotFoundError('Expense not found');

    assertNoPendingSuggestion(expense.pendingSuggestionId !== null);

    await this.expenses.softDelete({
      id: expense.id,
      companyId: input.companyId,
      userId: input.userId,
      expectedUpdatedAt: expense.updatedAt,
      deletedAt: this.clock.now(),
    });
    return { message: `Expense with id ${expense.id} deleted successfully` };
  }
}
