import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseCategoryController } from './adapters/inbound/expense-category.controller';
import { PrismaExpenseCategoryRepository } from './adapters/outbound/prisma-expense-category.repository';
import {
  EXPENSE_CATEGORY_REPOSITORY,
  ExpenseCategoryRepositoryPort,
} from './application/expense-category.ports';
import { CreateExpenseCategoryUseCase } from './application/use-cases/create-expense-category.use-case';
import { DeleteExpenseCategoryUseCase } from './application/use-cases/delete-expense-category.use-case';
import { FindAllExpenseCategoriesUseCase } from './application/use-cases/find-all-expense-categories.use-case';
import { UpdateExpenseCategoryUseCase } from './application/use-cases/update-expense-category.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [ExpenseCategoryController],
  providers: [
    {
      provide: EXPENSE_CATEGORY_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaExpenseCategoryRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: CreateExpenseCategoryUseCase,
      useFactory: (repo: ExpenseCategoryRepositoryPort) =>
        new CreateExpenseCategoryUseCase(repo),
      inject: [EXPENSE_CATEGORY_REPOSITORY],
    },
    {
      provide: UpdateExpenseCategoryUseCase,
      useFactory: (repo: ExpenseCategoryRepositoryPort) =>
        new UpdateExpenseCategoryUseCase(repo),
      inject: [EXPENSE_CATEGORY_REPOSITORY],
    },
    {
      provide: DeleteExpenseCategoryUseCase,
      useFactory: (repo: ExpenseCategoryRepositoryPort) =>
        new DeleteExpenseCategoryUseCase(repo),
      inject: [EXPENSE_CATEGORY_REPOSITORY],
    },
    {
      provide: FindAllExpenseCategoriesUseCase,
      useFactory: (repo: ExpenseCategoryRepositoryPort) =>
        new FindAllExpenseCategoriesUseCase(repo),
      inject: [EXPENSE_CATEGORY_REPOSITORY],
    },
  ],
})
export class ExpenseCategoryModule {}
