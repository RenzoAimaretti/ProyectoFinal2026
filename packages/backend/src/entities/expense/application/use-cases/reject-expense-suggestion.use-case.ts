import { EntityNotFoundError } from '../../domain/errors';
import {
  assertPendingSuggestion,
  assertRejectionReason,
} from '../../domain/expense.rules';
import { ExpenseSuggestionOutput } from '../dto/expense.output';
import { ClockPort } from '../ports/clock.port';
import { ExpenseSuggestionRepositoryPort } from '../ports/expense-suggestion-repository.port';

export interface RejectExpenseSuggestionInput {
  companyId: string;
  userId: string;
  id: string;
  reason: unknown;
}

/** Mirrors the daily report rejection: the reason is checked before any port. */
export class RejectExpenseSuggestionUseCase {
  constructor(
    private readonly suggestions: ExpenseSuggestionRepositoryPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(
    input: RejectExpenseSuggestionInput,
  ): Promise<ExpenseSuggestionOutput> {
    const reason = assertRejectionReason(input.reason);

    const suggestion = await this.suggestions.findById(
      input.id,
      input.companyId,
    );
    if (!suggestion) throw new EntityNotFoundError('Suggestion not found');
    assertPendingSuggestion(suggestion.status);

    return this.suggestions.reject({
      id: suggestion.id,
      companyId: input.companyId,
      resolvedBy: input.userId,
      resolvedAt: this.clock.now(),
      reason,
    });
  }
}
