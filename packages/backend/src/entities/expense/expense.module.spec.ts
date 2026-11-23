import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseCategoryController } from '../expense-category/adapters/inbound/expense-category.controller';
import { ExpenseCategoryModule } from '../expense-category/expense-category.module';
import { ValuationModule } from '../valuation/valuation.module';
import { ExpenseSuggestionController } from './adapters/inbound/expense-suggestion.controller';
import { ExpenseController } from './adapters/inbound/expense.controller';
import { ApproveExpenseSuggestionUseCase } from './application/use-cases/approve-expense-suggestion.use-case';
import { CreateExpenseUseCase } from './application/use-cases/create-expense.use-case';
import { ExpenseModule } from './expense.module';

describe('composition roots (expenses)', () => {
  it('wires ExpenseCategoryModule and ExpenseModule without a database', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ValuationModule, ExpenseCategoryModule, ExpenseModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(ExpenseController)).toBeInstanceOf(ExpenseController);
    expect(moduleRef.get(ExpenseSuggestionController)).toBeInstanceOf(
      ExpenseSuggestionController,
    );
    expect(moduleRef.get(ExpenseCategoryController)).toBeInstanceOf(
      ExpenseCategoryController,
    );
    expect(
      moduleRef.get(CreateExpenseUseCase, { strict: false }),
    ).toBeInstanceOf(CreateExpenseUseCase);
    expect(
      moduleRef.get(ApproveExpenseSuggestionUseCase, { strict: false }),
    ).toBeInstanceOf(ApproveExpenseSuggestionUseCase);
  });
});
