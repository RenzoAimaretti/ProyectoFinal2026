import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { FindRecipeUseCase } from '../../application/use-cases/find-recipe.use-case';
import { FindRecipesByLotUseCase } from '../../application/use-cases/find-recipes-by-lot.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';

type RequestWithUser = {
  user: {
    tenantId: string;
  };
};

/**
 * HTTP inbound adapter for recipes. Reads are scoped to the authenticated
 * tenant through the lot -> farm -> client chain owned by the repository port.
 * Items are enriched additively with `inputName` so the UI can show the product
 * name instead of the raw input id.
 */
@Controller('recipes')
export class RecipeController {
  constructor(
    private readonly findRecipesByLot: FindRecipesByLotUseCase,
    private readonly findRecipe: FindRecipeUseCase,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  async findByLot(@Query('lotId') lotId: string, @Req() req: RequestWithUser) {
    try {
      return await this.findRecipesByLot.execute(lotId, req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.findRecipe.execute(id, req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (
      error instanceof InvalidInputError ||
      error instanceof InvalidRelationError
    ) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
