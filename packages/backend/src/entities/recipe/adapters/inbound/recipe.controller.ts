import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import {
  CreateRecipeInput,
  UpdateRecipeInput,
} from '../../application/recipe.types';
import { CreatePrescriptionUseCase } from '../../application/use-cases/create-prescription.use-case';
import { FindRecipeUseCase } from '../../application/use-cases/find-recipe.use-case';
import { FindRecipesByLotUseCase } from '../../application/use-cases/find-recipes-by-lot.use-case';
import { UpdateRecipeUseCase } from '../../application/use-cases/update-recipe.use-case';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
  PrescriptionFrozenError,
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
 *
 * The controller is thin: it validates the protocol, delegates to a use case
 * and translates application errors to HTTP. No business logic and no Prisma.
 */
@Controller('recipes')
export class RecipeController {
  constructor(
    private readonly findRecipesByLot: FindRecipesByLotUseCase,
    private readonly findRecipe: FindRecipeUseCase,
    private readonly createPrescription: CreatePrescriptionUseCase,
    private readonly updateRecipe: UpdateRecipeUseCase,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'INGENIERO', 'OPERARIO', 'CONTRATISTA')
  @Get()
  async findByLot(@Query('lotId') lotId: string, @Req() req: RequestWithUser) {
    try {
      return await this.findRecipesByLot.execute(lotId, req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'INGENIERO', 'OPERARIO', 'CONTRATISTA')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.findRecipe.execute(id, req.user.tenantId);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INGENIERO', 'ADMIN')
  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: CreateRecipeInput) {
    try {
      return await this.createPrescription.execute(req.user.tenantId, body);
    } catch (error) {
      this.translate(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INGENIERO', 'ADMIN')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: UpdateRecipeInput,
  ) {
    try {
      return await this.updateRecipe.execute(id, req.user.tenantId, body);
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (
      error instanceof PrescriptionFrozenError ||
      error instanceof DuplicateEntityError
    ) {
      throw new ConflictException(error.message);
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
