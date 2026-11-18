import { CreateRecipeData, RecipeRecord } from '../../application/recipe.types';
import { EntityNotFoundError } from '../../domain/errors';
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

const itemInclude = {
  orderBy: [{ loadOrder: 'asc' }, { id: 'asc' }],
  include: { input: { select: { name: true } } },
};

describe('PrismaRecipeRepository', () => {
  const prisma = {
    recipe: {
      create: jest.fn(),
      update: jest.fn(),
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
      include: { items: itemInclude },
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
      include: { items: itemInclude, lot: { select: { area: true } } },
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
      include: { items: itemInclude },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });
  });

  it('exposes the input catalogue name additively on every item', async () => {
    prisma.recipe.findMany.mockResolvedValue([
      {
        ...persistedRecipe,
        items: [
          {
            ...persistedRecipe.items[1],
            input: { name: 'Atrazina' },
          },
          {
            ...persistedRecipe.items[0],
            input: { name: 'Glifosato' },
          },
        ],
      },
    ]);

    const [recipe] = await repository.findAllByLotForTenant('lot-1', 'tenant-1');

    expect(recipe.items.map((item) => item.inputName)).toEqual([
      'Atrazina',
      'Glifosato',
    ]);
  });

  it('returns an empty list when the tenant owns no recipe for the lot', async () => {
    prisma.recipe.findMany.mockResolvedValue([]);

    await expect(
      repository.findAllByLotForTenant('lot-1', 'tenant-2'),
    ).resolves.toEqual([]);
  });

  it('maps the prescription fields and the lot area additively', async () => {
    prisma.recipe.findFirst.mockResolvedValue({
      ...persistedRecipe,
      taskId: 'task-1',
      pest: 'Roya',
      crop: 'Trigo',
      reapplicationIntervalDays: 15,
      reapplicationDate: new Date('2026-03-20T00:00:00.000Z'),
      lot: { area: 12.5 },
      items: [{ ...persistedRecipe.items[0], dosageBasis: 'CONCENTRACION' }],
    });

    const recipe = await repository.findByIdForTenant('recipe-1', 'tenant-1');

    expect(recipe).toEqual(
      expect.objectContaining({
        taskId: 'task-1',
        pest: 'Roya',
        crop: 'Trigo',
        reapplicationIntervalDays: 15,
        reapplicationDate: new Date('2026-03-20T00:00:00.000Z'),
        lotArea: 12.5,
      }),
    );
    expect(recipe?.items[0].dosageBasis).toBe('CONCENTRACION');
  });

  it('reads the prescription attached to a task, scoped to the tenant', async () => {
    prisma.recipe.findFirst.mockResolvedValue({
      ...persistedRecipe,
      taskId: 'task-1',
    });

    await expect(
      repository.findByTaskId('task-1', 'tenant-1'),
    ).resolves.toEqual(expect.objectContaining({ taskId: 'task-1' }));

    expect(prisma.recipe.findFirst).toHaveBeenCalledWith({
      where: {
        taskId: 'task-1',
        lot: { farm: { client: { tenantId: 'tenant-1' } } },
      },
      include: { items: itemInclude },
    });
  });

  it('returns null when the task has no prescription for the tenant', async () => {
    prisma.recipe.findFirst.mockResolvedValue(null);

    await expect(
      repository.findByTaskId('task-1', 'tenant-1'),
    ).resolves.toBeNull();
  });

  it('updates the recipe and replaces its items, scoped to the tenant', async () => {
    prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1' });
    prisma.recipe.update.mockResolvedValue({
      ...persistedRecipe,
      pest: 'Roya',
      crop: 'Trigo',
    });

    await expect(
      repository.update('recipe-1', 'tenant-1', {
        pest: 'Roya',
        crop: 'Trigo',
        sprayVolume: 180,
        items: [
          {
            inputId: 'input-1',
            dose: 4,
            dosageBasis: 'POR_HECTAREA',
            unit: 'L',
            loadOrder: 1,
          },
        ],
      }),
    ).resolves.toEqual(expect.objectContaining({ pest: 'Roya', crop: 'Trigo' }));

    expect(prisma.recipe.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'recipe-1',
        lot: { farm: { client: { tenantId: 'tenant-1' } } },
      },
      select: { id: true },
    });
    expect(prisma.recipe.update).toHaveBeenCalledWith({
      where: { id: 'recipe-1' },
      data: {
        pest: 'Roya',
        crop: 'Trigo',
        sprayVolume: 180,
        items: {
          deleteMany: {},
          create: [
            {
              inputId: 'input-1',
              dose: 4,
              dosageBasis: 'POR_HECTAREA',
              unit: 'L',
              loadOrder: 1,
            },
          ],
        },
      },
      include: { items: itemInclude },
    });
  });

  it('rejects an update of a recipe outside the tenant', async () => {
    prisma.recipe.findFirst.mockResolvedValue(null);

    await expect(
      repository.update('recipe-1', 'tenant-2', { sprayVolume: 180 }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    expect(prisma.recipe.update).not.toHaveBeenCalled();
  });
});
