import { parseNewExpense } from '../../domain/expense.rules';
import { ExpenseOutput } from '../dto/expense.output';
import {
  amountText,
  assertActiveCategory,
  assertLotInTenant,
} from '../expense-support';
import { ClockPort } from '../ports/clock.port';
import { ExpenseCategoryReaderPort } from '../ports/expense-category-reader.port';
import { ExpenseRepositoryPort } from '../ports/expense-repository.port';
import { LotReaderPort } from '../ports/lot-reader.port';
import { MoneyValuationPort } from '../ports/money-valuation.port';

export interface CreateExpenseInput {
  /** De `req.user.firmaId`; nunca del body. */
  companyId: string;
  /** De `req.user.tenantId`. */
  tenantId: string;
  userId: string;
  /** Crudo (viene del borde HTTP): se valida en el dominio. */
  body: unknown;
}

export class CreateExpenseUseCase {
  constructor(
    private readonly expenses: ExpenseRepositoryPort,
    private readonly lots: LotReaderPort,
    private readonly categories: ExpenseCategoryReaderPort,
    private readonly valuation: MoneyValuationPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateExpenseInput): Promise<ExpenseOutput> {
    const values = parseNewExpense(input.body);

    await assertLotInTenant(this.lots, values.lotId, input.tenantId);
    await assertActiveCategory(
      this.categories,
      values.categoryId,
      input.tenantId,
    );

    // D25: no price, no expense. The market error propagates (503) and nothing is stored.
    const valuation = await this.valuation.valueToArs({
      amount: amountText(values.money),
      unit: values.money.unit,
      grain: values.money.grain,
    });

    return this.expenses.create({
      companyId: input.companyId,
      lotId: values.lotId,
      categoryId: values.categoryId,
      date: values.date,
      description: values.description,
      money: values.money,
      valuation,
      valuedAt: this.clock.now(),
      userId: input.userId,
    });
  }
}
