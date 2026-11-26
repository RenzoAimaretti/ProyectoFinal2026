import { parseExpenseFilters } from '../../domain/expense.rules';
import { ExpenseOutput } from '../dto/expense.output';
import { ExpenseRepositoryPort } from '../ports/expense-repository.port';

export interface FindExpensesInput {
  companyId: string;
  /** Query cruda; solo se leen lotId, categoryId, from y to. */
  query: unknown;
}

export class FindExpensesUseCase {
  constructor(private readonly expenses: ExpenseRepositoryPort) {}

  async execute(input: FindExpensesInput): Promise<ExpenseOutput[]> {
    return this.expenses.findAll(
      input.companyId,
      parseExpenseFilters(input.query),
    );
  }
}
