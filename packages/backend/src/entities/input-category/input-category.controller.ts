import { BadRequestException, Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateInputCategoryUseCase } from './application/use-cases/create-input-category.use-case';
import { UpdateInputCategoryUseCase } from './application/use-cases/update-input-category.use-case';
import { DeleteInputCategoryUseCase } from './application/use-cases/delete-input-category.use-case';
import { FindInputCategoryUseCase } from './application/use-cases/find-input-category.use-case';
import { FindAllInputCategoriesUseCase } from './application/use-cases/find-all-input-categories.use-case';
import { CategoryInUseError, DuplicateEntityError, EntityNotFoundError, InvalidInputError } from './domain/errors';
import { UpdateInputCategoryInput } from './application/input-category.types';
type RequestWithUser = { user: { tenantId: string } };
@Controller('input-categories')
export class InputCategoryController {
  constructor(
    private readonly all: FindAllInputCategoriesUseCase,
    private readonly one: FindInputCategoryUseCase,
    private readonly createCase: CreateInputCategoryUseCase,
    private readonly updateCase: UpdateInputCategoryUseCase,
    private readonly deleteCase: DeleteInputCategoryUseCase,
  ) {}
  @UseGuards(JwtAuthGuard) @Get()
  findAll(@Req() req: RequestWithUser) { return this.all.execute(req.user.tenantId); }
  @UseGuards(JwtAuthGuard) @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) { return this.handle(() => this.one.execute(id, req.user.tenantId)); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPERVISOR') @Post()
  create(@Req() req: RequestWithUser, @Body() body: { name: string }) { return this.handle(() => this.createCase.execute(req.user.tenantId, { name: body.name })); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPERVISOR') @Put(':id')
  update(@Param('id') id: string, @Req() req: RequestWithUser, @Body() body: UpdateInputCategoryInput) { return this.handle(() => this.updateCase.execute(id, req.user.tenantId, body)); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPERVISOR') @Delete(':id')
  delete(@Param('id') id: string, @Req() req: RequestWithUser) { return this.handle(() => this.deleteCase.execute(id, req.user.tenantId)); }
  private async handle<T>(action: () => Promise<T>): Promise<T> {
    try { return await action(); }
    catch (error) {
      if (error instanceof EntityNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof DuplicateEntityError || error instanceof CategoryInUseError) throw new ConflictException(error.message);
      if (error instanceof InvalidInputError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
