import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RecipeRecord } from '../../application/recipe.types';
import { FindRecipeUseCase } from '../../application/use-cases/find-recipe.use-case';
import { FindRecipesByLotUseCase } from '../../application/use-cases/find-recipes-by-lot.use-case';
import {
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { RecipeController } from './recipe.controller';

const mockRecipe: RecipeRecord = {
  id: 'recipe-1',
  lotId: 'lot-1',
  date: new Date('2026-03-01T00:00:00.000Z'),
  status: 'ACTIVA',
  observations: null,
  sprayVolume: 150,
  sprayVolumeUnit: 'L/ha',
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  items: [
    {
      id: 'item-1',
      recipeId: 'recipe-1',
      inputId: 'input-1',
      dose: 2.5,
      unit: 'L/ha',
      loadOrder: 1,
      inputName: 'Atrazina',
    },
  ],
};

const req = { user: { tenantId: 'tenant-1' } };

describe('RecipeController', () => {
  let controller: RecipeController;
  let findRecipesByLot: jest.Mocked<FindRecipesByLotUseCase>;
  let findRecipe: jest.Mocked<FindRecipeUseCase>;

  beforeEach(() => {
    findRecipesByLot = { execute: jest.fn() } as unknown as jest.Mocked<FindRecipesByLotUseCase>;
    findRecipe = { execute: jest.fn() } as unknown as jest.Mocked<FindRecipeUseCase>;

    controller = new RecipeController(findRecipesByLot, findRecipe);
  });

  it('protects every route with JwtAuthGuard', () => {
    for (const method of ['findByLot', 'findOne'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        RecipeController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('lists the recipes of a lot scoped to the tenant and exposes input names', async () => {
    findRecipesByLot.execute.mockResolvedValue([mockRecipe]);

    await expect(controller.findByLot('lot-1', req as never)).resolves.toEqual([
      mockRecipe,
    ]);

    expect(findRecipesByLot.execute).toHaveBeenCalledWith('lot-1', 'tenant-1');
    const [result] = await controller.findByLot('lot-1', req as never);
    expect(result.items[0].inputName).toBe('Atrazina');
  });

  it('reads a single recipe scoped to the tenant', async () => {
    findRecipe.execute.mockResolvedValue(mockRecipe);

    await expect(controller.findOne('recipe-1', req as never)).resolves.toEqual(
      mockRecipe,
    );

    expect(findRecipe.execute).toHaveBeenCalledWith('recipe-1', 'tenant-1');
  });

  it('maps domain errors to HTTP exceptions', async () => {
    findRecipe.execute.mockRejectedValue(
      new EntityNotFoundError('Recipe with id recipe-9 not found'),
    );
    await expect(controller.findOne('recipe-9', req as never)).rejects.toThrow(
      NotFoundException,
    );

    findRecipesByLot.execute.mockRejectedValue(
      new InvalidInputError('lotId is required'),
    );
    await expect(controller.findByLot('', req as never)).rejects.toThrow(
      BadRequestException,
    );
  });
});
