import { InvalidInputError } from '../../domain/errors';
import { ExpenseSuggestionStatusValue } from '../../domain/expense.rules';
import { ExpenseSuggestionOutput } from '../dto/expense.output';
import { ExpenseSuggestionRepositoryPort } from '../ports/expense-suggestion-repository.port';

export interface FindExpenseSuggestionsInput {
  role: string;
  userId: string;
  companyId: string;
  status?: unknown;
}

const STATUSES: readonly string[] = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];

export class FindExpenseSuggestionsUseCase {
  constructor(private readonly suggestions: ExpenseSuggestionRepositoryPort) {}

  async execute(
    input: FindExpenseSuggestionsInput,
  ): Promise<ExpenseSuggestionOutput[]> {
    let status: ExpenseSuggestionStatusValue | undefined;
    if (input.status !== undefined && input.status !== '') {
      if (
        typeof input.status !== 'string' ||
        !STATUSES.includes(input.status)
      ) {
        throw new InvalidInputError(
          'status debe ser PENDIENTE, APROBADA o RECHAZADA',
        );
      }
      status = input.status as ExpenseSuggestionStatusValue;
    }

    return this.suggestions.findAll({
      companyId: input.companyId,
      status,
      // Only the ADMIN sees the whole inbox; anyone else sees their own.
      suggestedBy: input.role === 'ADMIN' ? undefined : input.userId,
    });
  }
}
