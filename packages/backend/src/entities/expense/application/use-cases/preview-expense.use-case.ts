import { parseMoneyInput } from '../../domain/expense.rules';
import { ExpensePreviewOutput } from '../dto/expense.output';
import { amountText } from '../expense-support';
import { ClockPort } from '../ports/clock.port';
import { MoneyValuationPort } from '../ports/money-valuation.port';

/** Values an expense for the confirmation summary (D24) without persisting. */
export class PreviewExpenseUseCase {
  constructor(
    private readonly valuation: MoneyValuationPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(body: unknown): Promise<ExpensePreviewOutput> {
    const money = parseMoneyInput(body);
    const amount = amountText(money);
    const valued = await this.valuation.valueToArs({
      amount,
      unit: money.unit,
      grain: money.grain,
    });

    return {
      amount,
      unit: money.unit,
      grain: money.grain,
      ...valued,
      valuedAt: this.clock.now(),
    };
  }
}
