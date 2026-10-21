import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ROLES_KEY } from '../../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RecipeRecord } from '../../application/recipe.types';
import { CreatePrescriptionUseCase } from '../../application/use-cases/create-prescription.use-case';
import { FindRecipeUseCase } from '../../application/use-cases/find-recipe.use-case';
import { FindRecipesByLotUseCase } from '../../application/use-cases/find-recipes-by-lot.use-case';
import { UpdateRecipeUseCase } from '../../application/use-cases/update-recipe.use-case';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  PrescriptionFrozenError,
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

const createBody = {
  taskId: 'task-1',
  date: '2026-03-01T00:00:00.000Z',
  sprayVolume: 150,
  sprayVolumeUnit: 'L/ha',
  items: [{ inputId: 'input-1', dose: 2.5, loadOrder: 1 }],
};

const updateBody = {
  sprayVolume: 180,
  items: [{ inputId: 'input-1', dose: 3, loadOrder: 1 }],
};

function rolesOf(method: keyof RecipeController): unknown {
  return Reflect.getMetadata(
    ROLES_KEY,
    RecipeController.prototype[method] as (...args: never[]) => unknown,
  );
}

describe('RecipeController', () => {
  let controller: RecipeController;
  let findRecipesByLot: jest.Mocked<FindRecipesByLotUseCase>;
  let findRecipe: jest.Mocked<FindRecipeUseCase>;
  let createPrescription: jest.Mocked<CreatePrescriptionUseCase>;
  let updateRecipe: jest.Mocked<UpdateRecipeUseCase>;

  beforeEach(() => {
    findRecipesByLot = { execute: jest.fn() } as unknown as jest.Mocked<FindRecipesByLotUseCase>;
    findRecipe = { execute: jest.fn() } as unknown as jest.Mocked<FindRecipeUseCase>;
    createPrescription = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreatePrescriptionUseCase>;
    updateRecipe = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateRecipeUseCase>;

    controller = new RecipeController(
      findRecipesByLot,
      findRecipe,
      createPrescription,
      updateRecipe,
    );
  });

  it('protects every route with JwtAuthGuard', () => {
    for (const method of [
      'findByLot',
      'findOne',
      'create',
      'update',
    ] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        RecipeController.prototype[method],
      ) as Array<new (...args: never[]) => unknown> | undefined;

      expect(guards).toContain(JwtAuthGuard);
    }
  });

  it('restricts the writes to INGENIERO and ADMIN', () => {
    expect(rolesOf('create')).toEqual(['INGENIERO', 'ADMIN']);
    expect(rolesOf('update')).toEqual(['INGENIERO', 'ADMIN']);
  });

  it('opens the reads to the agronomist and the field roles', () => {
    const expected = [
      'ADMIN',
      'SUPERVISOR',
      'INGENIERO',
      'OPERARIO',
      'CONTRATISTA',
    ];

    expect(rolesOf('findByLot')).toEqual(expected);
    expect(rolesOf('findOne')).toEqual(expected);
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

  it('delegates prescription creation to the use case', async () => {
    createPrescription.execute.mockResolvedValue(mockRecipe);

    await expect(
      controller.create(req as never, createBody),
    ).resolves.toEqual(mockRecipe);

    expect(createPrescription.execute).toHaveBeenCalledWith(
      'tenant-1',
      createBody,
    );
  });

  it('delegates the prescription edit to the use case', async () => {
    updateRecipe.execute.mockResolvedValue(mockRecipe);

    await expect(
      controller.update('recipe-1', req as never, updateBody),
    ).resolves.toEqual(mockRecipe);

    expect(updateRecipe.execute).toHaveBeenCalledWith(
      'recipe-1',
      'tenant-1',
      updateBody,
    );
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

  it('maps a frozen prescription to 409 Conflict', async () => {
    updateRecipe.execute.mockRejectedValue(
      new PrescriptionFrozenError('The prescription is frozen'),
    );

    await expect(
      controller.update('recipe-1', req as never, updateBody),
    ).rejects.toThrow(ConflictException);
  });

  it('maps a duplicate prescription to 409 Conflict', async () => {
    createPrescription.execute.mockRejectedValue(
      new DuplicateEntityError('Task task-1 already has a prescription'),
    );

    await expect(
      controller.create(req as never, createBody),
    ).rejects.toThrow(ConflictException);
  });

  it('rethrows unknown infrastructure errors untouched', async () => {
    const unexpected = new Error('boom');
    findRecipe.execute.mockRejectedValue(unexpected);

    await expect(controller.findOne('recipe-1', req as never)).rejects.toBe(
      unexpected,
    );
  });
});
