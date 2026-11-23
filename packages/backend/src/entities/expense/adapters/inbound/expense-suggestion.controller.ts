import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { ApproveExpenseSuggestionUseCase } from '../../application/use-cases/approve-expense-suggestion.use-case';
import { FindExpenseSuggestionsUseCase } from '../../application/use-cases/find-expense-suggestions.use-case';
import { RejectExpenseSuggestionUseCase } from '../../application/use-cases/reject-expense-suggestion.use-case';
import { handleExpenseErrors } from './expense-http-errors';

interface RequestWithUser {
  user: { id: string; tenantId: string; firmaId: string; role: string };
}

/**
 * Suggestion inbox. The ADMIN sees every suggestion of the firma and resolves
 * them; the SUPERVISOR only sees their own (status and rejection reason).
 */
@Controller('expense-suggestions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR')
export class ExpenseSuggestionController {
  constructor(
    private readonly findSuggestions: FindExpenseSuggestionsUseCase,
    private readonly approveSuggestion: ApproveExpenseSuggestionUseCase,
    private readonly rejectSuggestion: RejectExpenseSuggestionUseCase,
  ) {}

  @Get()
  findAll(@Req() req: RequestWithUser, @Query() query: { status?: string }) {
    return handleExpenseErrors(() =>
      this.findSuggestions.execute({
        role: req.user.role,
        userId: req.user.id,
        companyId: req.user.firmaId,
        status: query?.status,
      }),
    );
  }

  @Post(':id/approve')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string, @Req() req: RequestWithUser) {
    return handleExpenseErrors(() =>
      this.approveSuggestion.execute({
        companyId: req.user.firmaId,
        tenantId: req.user.tenantId,
        userId: req.user.id,
        id,
      }),
    );
  }

  @Post(':id/reject')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: { reason?: unknown },
  ) {
    return handleExpenseErrors(() =>
      this.rejectSuggestion.execute({
        companyId: req.user.firmaId,
        userId: req.user.id,
        id,
        reason: body?.reason,
      }),
    );
  }
}
