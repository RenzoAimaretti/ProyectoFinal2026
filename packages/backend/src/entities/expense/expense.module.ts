import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { ValueMoneyUseCase } from '../valuation/application/use-cases/value-money.use-case';
import { ValuationModule } from '../valuation/valuation.module';
import { ExpenseSuggestionController } from './adapters/inbound/expense-suggestion.controller';
import { ExpenseController } from './adapters/inbound/expense.controller';
import { PrismaExpenseCategoryReader } from './adapters/outbound/prisma-expense-category.reader';
import { PrismaExpenseSuggestionRepository } from './adapters/outbound/prisma-expense-suggestion.repository';
import { PrismaExpenseRepository } from './adapters/outbound/prisma-expense.repository';
import { PrismaLotReader } from './adapters/outbound/prisma-lot.reader';
import { SystemClock } from './adapters/outbound/system-clock';
import { ValuationMoneyValuationAdapter } from './adapters/outbound/valuation-money-valuation.adapter';
import { CLOCK, ClockPort } from './application/ports/clock.port';
import {
  EXPENSE_CATEGORY_READER,
  ExpenseCategoryReaderPort,
} from './application/ports/expense-category-reader.port';
import {
  EXPENSE_REPOSITORY,
  ExpenseRepositoryPort,
} from './application/ports/expense-repository.port';
import {
  EXPENSE_SUGGESTION_REPOSITORY,
  ExpenseSuggestionRepositoryPort,
} from './application/ports/expense-suggestion-repository.port';
import { LOT_READER, LotReaderPort } from './application/ports/lot-reader.port';
import {
  MONEY_VALUATION,
  MoneyValuationPort,
} from './application/ports/money-valuation.port';
import { ApproveExpenseSuggestionUseCase } from './application/use-cases/approve-expense-suggestion.use-case';
import { CreateExpenseSuggestionUseCase } from './application/use-cases/create-expense-suggestion.use-case';
import { CreateExpenseUseCase } from './application/use-cases/create-expense.use-case';
import { DeleteExpenseUseCase } from './application/use-cases/delete-expense.use-case';
import { FindExpenseSuggestionsUseCase } from './application/use-cases/find-expense-suggestions.use-case';
import { FindExpensesUseCase } from './application/use-cases/find-expenses.use-case';
import { PreviewExpenseUseCase } from './application/use-cases/preview-expense.use-case';
import { RejectExpenseSuggestionUseCase } from './application/use-cases/reject-expense-suggestion.use-case';
import { UpdateExpenseUseCase } from './application/use-cases/update-expense.use-case';

@Module({
  imports: [PrismaModule, ValuationModule],
  controllers: [ExpenseController, ExpenseSuggestionController],
  providers: [
    {
      provide: EXPENSE_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaExpenseRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: EXPENSE_SUGGESTION_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaExpenseSuggestionRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: LOT_READER,
      useFactory: (prisma: PrismaService) => new PrismaLotReader(prisma),
      inject: [PrismaService],
    },
    {
      provide: EXPENSE_CATEGORY_READER,
      useFactory: (prisma: PrismaService) =>
        new PrismaExpenseCategoryReader(prisma),
      inject: [PrismaService],
    },
    {
      provide: MONEY_VALUATION,
      useFactory: (valueMoney: ValueMoneyUseCase) =>
        new ValuationMoneyValuationAdapter(valueMoney),
      inject: [ValueMoneyUseCase],
    },
    { provide: CLOCK, useFactory: () => new SystemClock() },
    {
      provide: PreviewExpenseUseCase,
      useFactory: (valuation: MoneyValuationPort, clock: ClockPort) =>
        new PreviewExpenseUseCase(valuation, clock),
      inject: [MONEY_VALUATION, CLOCK],
    },
    {
      provide: CreateExpenseUseCase,
      useFactory: (
        expenses: ExpenseRepositoryPort,
        lots: LotReaderPort,
        categories: ExpenseCategoryReaderPort,
        valuation: MoneyValuationPort,
        clock: ClockPort,
      ) =>
        new CreateExpenseUseCase(expenses, lots, categories, valuation, clock),
      inject: [
        EXPENSE_REPOSITORY,
        LOT_READER,
        EXPENSE_CATEGORY_READER,
        MONEY_VALUATION,
        CLOCK,
      ],
    },
    {
      provide: FindExpensesUseCase,
      useFactory: (expenses: ExpenseRepositoryPort) =>
        new FindExpensesUseCase(expenses),
      inject: [EXPENSE_REPOSITORY],
    },
    {
      provide: UpdateExpenseUseCase,
      useFactory: (
        expenses: ExpenseRepositoryPort,
        lots: LotReaderPort,
        categories: ExpenseCategoryReaderPort,
        valuation: MoneyValuationPort,
        clock: ClockPort,
      ) =>
        new UpdateExpenseUseCase(expenses, lots, categories, valuation, clock),
      inject: [
        EXPENSE_REPOSITORY,
        LOT_READER,
        EXPENSE_CATEGORY_READER,
        MONEY_VALUATION,
        CLOCK,
      ],
    },
    {
      provide: DeleteExpenseUseCase,
      useFactory: (expenses: ExpenseRepositoryPort, clock: ClockPort) =>
        new DeleteExpenseUseCase(expenses, clock),
      inject: [EXPENSE_REPOSITORY, CLOCK],
    },
    {
      provide: CreateExpenseSuggestionUseCase,
      useFactory: (
        expenses: ExpenseRepositoryPort,
        suggestions: ExpenseSuggestionRepositoryPort,
        lots: LotReaderPort,
        categories: ExpenseCategoryReaderPort,
      ) =>
        new CreateExpenseSuggestionUseCase(
          expenses,
          suggestions,
          lots,
          categories,
        ),
      inject: [
        EXPENSE_REPOSITORY,
        EXPENSE_SUGGESTION_REPOSITORY,
        LOT_READER,
        EXPENSE_CATEGORY_READER,
      ],
    },
    {
      provide: FindExpenseSuggestionsUseCase,
      useFactory: (suggestions: ExpenseSuggestionRepositoryPort) =>
        new FindExpenseSuggestionsUseCase(suggestions),
      inject: [EXPENSE_SUGGESTION_REPOSITORY],
    },
    {
      provide: ApproveExpenseSuggestionUseCase,
      useFactory: (
        expenses: ExpenseRepositoryPort,
        suggestions: ExpenseSuggestionRepositoryPort,
        lots: LotReaderPort,
        categories: ExpenseCategoryReaderPort,
        valuation: MoneyValuationPort,
        clock: ClockPort,
      ) =>
        new ApproveExpenseSuggestionUseCase(
          expenses,
          suggestions,
          lots,
          categories,
          valuation,
          clock,
        ),
      inject: [
        EXPENSE_REPOSITORY,
        EXPENSE_SUGGESTION_REPOSITORY,
        LOT_READER,
        EXPENSE_CATEGORY_READER,
        MONEY_VALUATION,
        CLOCK,
      ],
    },
    {
      provide: RejectExpenseSuggestionUseCase,
      useFactory: (
        suggestions: ExpenseSuggestionRepositoryPort,
        clock: ClockPort,
      ) => new RejectExpenseSuggestionUseCase(suggestions, clock),
      inject: [EXPENSE_SUGGESTION_REPOSITORY, CLOCK],
    },
  ],
})
export class ExpenseModule {}
