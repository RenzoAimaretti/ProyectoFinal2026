import { CreateRecipeData, RecipeRecord } from '../../application/recipe.types';
import { PrismaRecipeRepository } from './prisma-recipe.repository';

const persistedRecipe = {
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
      id: 'item-2',
      recipeId: 'recipe-1',
      inputId: 'input-2',
      dose: 1.5,
      unit: null,
      loadOrder: 2,
    },
    {
      id: 'item-1',
      recipeId: 'recipe-1',
      inputId: 'input-1',
      dose: 2.5,
      unit: 'L/ha',
      loadOrder: 1,
    },
  ],
};

const expectedRecord: RecipeRecord = {
  id: 'recipe-1',
  lotId: 'lot-1',
  date: new Date('2026-03-01T00:00:00.000Z'),
  status: 'ACTIVA',
  observations: null,
  sprayVolume: 150,
  sprayVolumeUnit: 'L/ha',
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  items: [persistedRecipe.items[1], persistedRecipe.items[0]],
};

const itemOrderBy = { orderBy: [{ loadOrder: 'asc' }, { id: 'asc' }] };

describe('PrismaRecipeRepository', () => {
  const prisma = {
    recipe: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const repository = new PrismaRecipeRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists the recipe and its items in a single aggregate write', async () => {
    const data: CreateRecipeData = {
      lotId: 'lot-1',
      date: new Date('2026-03-01T00:00:00.000Z'),
      status: 'ACTIVA',
      observations: null,
      sprayVolume: 150,
      sprayVolumeUnit: 'L/ha',
      items: [
        { inputId: 'input-1', dose: 2.5, unit: 'L/ha', loadOrder: 1 },
        { inputId: 'input-2', dose: 1.5, unit: null, loadOrder: 2 },
      ],
    };
    prisma.recipe.create.mockResolvedValue(persistedRecipe);

    await expect(repository.create(data)).resolves.toEqual(expectedRecord);

    expect(prisma.recipe.create).toHaveBeenCalledWith({
      data: {
        lotId: 'lot-1',
        date: new Date('2026-03-01T00:00:00.000Z'),
        status: 'ACTIVA',
        observations: null,
        sprayVolume: 150,
        sprayVolumeUnit: 'L/ha',
        items: {
          create: [
            { inputId: 'input-1', dose: 2.5, unit: 'L/ha', loadOrder: 1 },
            { inputId: 'input-2', dose: 1.5, unit: null, loadOrder: 2 },
          ],
        },
      },
      include: { items: itemOrderBy },
    });
  });

  it('resolves the stored items in loading order even when the database returns them unordered', async () => {
    prisma.recipe.create.mockResolvedValue(persistedRecipe);

    const recipe = await repository.create({
      lotId: 'lot-1',
      date: new Date('2026-03-01T00:00:00.000Z'),
      status: 'ACTIVA',
      observations: null,
      sprayVolume: 150,
      sprayVolumeUnit: 'L/ha',
      items: [],
    });

    expect(recipe.items.map((item) => item.loadOrder)).toEqual([1, 2]);
    expect(recipe.items.map((item) => item.inputId)).toEqual([
      'input-1',
      'input-2',
    ]);
  });

  it('scopes the recipe read to the tenant through the lot chain', async () => {
    prisma.recipe.findFirst.mockResolvedValue(persistedRecipe);

    await expect(
      repository.findByIdForTenant('recipe-1', 'tenant-1'),
    ).resolves.toEqual(expectedRecord);

    expect(prisma.recipe.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'recipe-1',
        lot: { farm: { client: { tenantId: 'tenant-1' } } },
      },
      include: { items: itemOrderBy },
    });
  });

  it('returns null when the recipe is outside the tenant', async () => {
    prisma.recipe.findFirst.mockResolvedValue(null);

    await expect(
      repository.findByIdForTenant('recipe-1', 'tenant-2'),
    ).resolves.toBeNull();
  });

  it('lists the recipes of a lot with a deterministic order scoped to the tenant', async () => {
    prisma.recipe.findMany.mockResolvedValue([persistedRecipe]);

    await expect(
      repository.findAllByLotForTenant('lot-1', 'tenant-1'),
    ).resolves.toEqual([expectedRecord]);

    expect(prisma.recipe.findMany).toHaveBeenCalledWith({
      where: {
        lotId: 'lot-1',
        lot: { farm: { client: { tenantId: 'tenant-1' } } },
      },
      include: { items: itemOrderBy },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });
  });

  it('returns an empty list when the tenant owns no recipe for the lot', async () => {
    prisma.recipe.findMany.mockResolvedValue([]);

    await expect(
      repository.findAllByLotForTenant('lot-1', 'tenant-2'),
    ).resolves.toEqual([]);
  });
});
