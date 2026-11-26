import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { UpdateExpenseCategoryInput } from '../../application/expense-category.types';
import { CreateExpenseCategoryUseCase } from '../../application/use-cases/create-expense-category.use-case';
import { DeleteExpenseCategoryUseCase } from '../../application/use-cases/delete-expense-category.use-case';
import { FindAllExpenseCategoriesUseCase } from '../../application/use-cases/find-all-expense-categories.use-case';
import { UpdateExpenseCategoryUseCase } from '../../application/use-cases/update-expense-category.use-case';
import {
  CategoryInUseError,
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';

interface RequestWithUser {
  user: { tenantId: string };
}

/** Categories are shared by every company of the tenant; the tenant comes from the token. */
@Controller('expense-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR')
export class ExpenseCategoryController {
  constructor(
    private readonly findAllCategories: FindAllExpenseCategoriesUseCase,
    private readonly createCategory: CreateExpenseCategoryUseCase,
    private readonly updateCategory: UpdateExpenseCategoryUseCase,
    private readonly deleteCategory: DeleteExpenseCategoryUseCase,
  ) {}

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.findAllCategories.execute(req.user.tenantId);
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() body: { name: string }) {
    return this.handle(() =>
      this.createCategory.execute(req.user.tenantId, { name: body?.name }),
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: UpdateExpenseCategoryInput,
  ) {
    // Only the supported keys travel to the use case; anything else is dropped.
    const data: UpdateExpenseCategoryInput = {};
    if (body && 'name' in body) data.name = body.name;
    if (body && 'active' in body) data.active = body.active;
    return this.handle(() =>
      this.updateCategory.execute(id, req.user.tenantId, data),
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.handle(() =>
      this.deleteCategory.execute(id, req.user.tenantId),
    );
  }

  private async handle<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof EntityNotFoundError)
        throw new NotFoundException(error.message);
      if (
        error instanceof DuplicateEntityError ||
        error instanceof CategoryInUseError
      )
        throw new ConflictException(error.message);
      if (error instanceof InvalidInputError)
        throw new BadRequestException(error.message);
      throw error;
    }
  }
}
