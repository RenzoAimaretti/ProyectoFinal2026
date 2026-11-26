import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { CreateExpenseSuggestionUseCase } from '../../application/use-cases/create-expense-suggestion.use-case';
import { CreateExpenseUseCase } from '../../application/use-cases/create-expense.use-case';
import { DeleteExpenseUseCase } from '../../application/use-cases/delete-expense.use-case';
import { FindExpensesUseCase } from '../../application/use-cases/find-expenses.use-case';
import { PreviewExpenseUseCase } from '../../application/use-cases/preview-expense.use-case';
import { UpdateExpenseUseCase } from '../../application/use-cases/update-expense.use-case';
import { handleExpenseErrors } from './expense-http-errors';

interface RequestWithUser {
  user: { id: string; tenantId: string; firmaId: string; role?: string };
}

/**
 * Manual expenses. The firma ALWAYS comes from `req.user.firmaId`, the tenant
 * from `req.user.tenantId`: no `companyId` is read from the body or the query.
 * ADMIN and SUPERVISOR create and list; only the ADMIN edits or deletes
 * directly; the SUPERVISOR proposes changes as suggestions.
 */
@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR')
export class ExpenseController {
  constructor(
    private readonly previewExpense: PreviewExpenseUseCase,
    private readonly createExpense: CreateExpenseUseCase,
    private readonly findExpenses: FindExpensesUseCase,
    private readonly updateExpense: UpdateExpenseUseCase,
    private readonly deleteExpense: DeleteExpenseUseCase,
    private readonly createSuggestion: CreateExpenseSuggestionUseCase,
  ) {}

  /** Values the expense in ARS for the confirmation summary; persists nothing (D24). */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(@Body() body: unknown) {
    return handleExpenseErrors(() => this.previewExpense.execute(body));
  }

  @Get()
  findAll(@Req() req: RequestWithUser, @Query() query: Record<string, string>) {
    return handleExpenseErrors(() =>
      this.findExpenses.execute({ companyId: req.user.firmaId, query }),
    );
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() body: unknown) {
    return handleExpenseErrors(() =>
      this.createExpense.execute({
        companyId: req.user.firmaId,
        tenantId: req.user.tenantId,
        userId: req.user.id,
        body,
      }),
    );
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: unknown,
  ) {
    return handleExpenseErrors(() =>
      this.updateExpense.execute({
        companyId: req.user.firmaId,
        tenantId: req.user.tenantId,
        userId: req.user.id,
        id,
        body,
      }),
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return handleExpenseErrors(() =>
      this.deleteExpense.execute({
        companyId: req.user.firmaId,
        userId: req.user.id,
        id,
      }),
    );
  }

  @Post(':id/suggestions')
  @Roles('SUPERVISOR')
  suggest(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: unknown,
  ) {
    return handleExpenseErrors(() =>
      this.createSuggestion.execute({
        companyId: req.user.firmaId,
        tenantId: req.user.tenantId,
        userId: req.user.id,
        expenseId: id,
        body,
      }),
    );
  }
}
