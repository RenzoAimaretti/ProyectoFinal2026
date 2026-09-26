import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import {
  LotReaderPort,
  RecipeInputReaderPort,
  RecipeRepositoryPort,
} from '../recipe.ports';
import { CreateRecipeInput, RecipeRecord } from '../recipe.types';
import { CreateRecipeUseCase } from './create-recipe.use-case';
import { FindRecipeUseCase } from './find-recipe.use-case';
import { FindRecipesByLotUseCase } from './find-recipes-by-lot.use-case';

const baseRecipe: RecipeRecord = {
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
    },
    {
      id: 'item-2',
      recipeId: 'recipe-1',
      inputId: 'input-2',
      dose: 1.5,
      unit: null,
      loadOrder: 2,
    },
  ],
};

const validRecipeInput: CreateRecipeInput = {
  lotId: 'lot-1',
  date: '2026-03-01T00:00:00.000Z',
  sprayVolume: 150,
  sprayVolumeUnit: 'L/ha',
  items: [
    { inputId: 'input-2', dose: 1.5, loadOrder: 2 },
    { inputId: 'input-1', dose: 2.5, unit: 'L/ha', loadOrder: 1 },
  ],
};

function createRepository(): jest.Mocked<RecipeRepositoryPort> {
  return {
    create: jest.fn(),
    findByIdForTenant: jest.fn(),
    findAllByLotForTenant: jest.fn(),
  };
}

function createLotReader(): jest.Mocked<LotReaderPort> {
  return {
    findByIdForTenant: jest.fn(),
  };
}

function createInputReader(): jest.Mocked<RecipeInputReaderPort> {
  return {
    findExistingIdsForTenant: jest.fn(),
  };
}

describe('Recipe use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/recipe');
    const files = [
      'domain/errors.ts',
      'domain/recipe-status.ts',
      'domain/recipe.rules.ts',
      'application/recipe.ports.ts',
      'application/recipe.types.ts',
      'application/recipe.validation.ts',
      'application/use-cases/create-recipe.use-case.ts',
      'application/use-cases/find-recipe.use-case.ts',
      'application/use-cases/find-recipes-by-lot.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('CreateRecipeUseCase', () => {
    let repository: jest.Mocked<RecipeRepositoryPort>;
    let lotReader: jest.Mocked<LotReaderPort>;
    let inputReader: jest.Mocked<RecipeInputReaderPort>;
    let useCase: CreateRecipeUseCase;

    beforeEach(() => {
      repository = createRepository();
      lotReader = createLotReader();
      inputReader = createInputReader();
      lotReader.findByIdForTenant.mockResolvedValue({ id: 'lot-1' });
      inputReader.findExistingIdsForTenant.mockResolvedValue([
        'input-1',
        'input-2',
      ]);
      useCase = new CreateRecipeUseCase(
        repository,
        lotReader,
        inputReader,
      );
    });

    it.each([
      ['an empty lot id', { ...validRecipeInput, lotId: '' }],
      ['an invalid date', { ...validRecipeInput, date: 'not-a-date' }],
      ['an empty item list', { ...validRecipeInput, items: [] }],
      [
        'a zero dose',
        {
          ...validRecipeInput,
          items: [{ inputId: 'input-1', dose: 0, loadOrder: 1 }],
        },
      ],
      [
        'a negative dose',
        {
          ...validRecipeInput,
          items: [{ inputId: 'input-1', dose: -3, loadOrder: 1 }],
        },
      ],
      [
        'a loading order below one',
        {
          ...validRecipeInput,
          items: [{ inputId: 'input-1', dose: 2, loadOrder: 0 }],
        },
      ],
      [
        'a fractional loading order',
        {
          ...validRecipeInput,
          items: [{ inputId: 'input-1', dose: 2, loadOrder: 1.5 }],
        },
      ],
      [
        'a repeated loading order',
        {
          ...validRecipeInput,
          items: [
            { inputId: 'input-1', dose: 2, loadOrder: 1 },
            { inputId: 'input-2', dose: 3, loadOrder: 1 },
          ],
        },
      ],
      ['a zero spray volume', { ...validRecipeInput, sprayVolume: 0 }],
      ['a negative spray volume', { ...validRecipeInput, sprayVolume: -10 }],
      [
        'a non finite spray volume',
        { ...validRecipeInput, sprayVolume: Number.NaN },
      ],
      [
        'a non numeric spray volume',
        { ...validRecipeInput, sprayVolume: '150' },
      ],
      [
        'a missing spray volume unit',
        { ...validRecipeInput, sprayVolumeUnit: undefined },
      ],
      [
        'an empty spray volume unit',
        { ...validRecipeInput, sprayVolumeUnit: '   ' },
      ],
    ])('rejects %s before touching any port', async (_label, input) => {
      await expect(
        useCase.execute('tenant-1', input as CreateRecipeInput),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(lotReader.findByIdForTenant).not.toHaveBeenCalled();
      expect(inputReader.findExistingIdsForTenant).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a non array item list', async () => {
      await expect(
        useCase.execute('tenant-1', {
          ...validRecipeInput,
          items: undefined,
        } as unknown as CreateRecipeInput),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a lot that does not belong to the authenticated tenant', async () => {
      lotReader.findByIdForTenant.mockResolvedValue(null);

      await expect(
        useCase.execute('tenant-1', validRecipeInput),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(lotReader.findByIdForTenant).toHaveBeenCalledWith(
        'lot-1',
        'tenant-1',
      );
      expect(inputReader.findExistingIdsForTenant).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects items whose inputs do not belong to the authenticated tenant', async () => {
      inputReader.findExistingIdsForTenant.mockResolvedValue(['input-1']);

      await expect(
        useCase.execute('tenant-1', validRecipeInput),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(inputReader.findExistingIdsForTenant).toHaveBeenCalledWith(
        ['input-1', 'input-2'],
        'tenant-1',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('persists the aggregate with a unit-bearing spray volume and deterministic loading order', async () => {
      repository.create.mockResolvedValue(baseRecipe);

      await expect(
        useCase.execute('tenant-1', validRecipeInput),
      ).resolves.toEqual(baseRecipe);

      expect(repository.create).toHaveBeenCalledWith({
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
      });
      expect(lotReader.findByIdForTenant).toHaveBeenCalledWith(
        'lot-1',
        'tenant-1',
      );
    });

    it('trims the spray volume unit before persisting', async () => {
      repository.create.mockResolvedValue(baseRecipe);

      await useCase.execute('tenant-1', {
        ...validRecipeInput,
        sprayVolumeUnit: '  L/ha  ',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ sprayVolumeUnit: 'L/ha' }),
      );
    });

    it('trims the observations and the tenant id before persisting', async () => {
      repository.create.mockResolvedValue(baseRecipe);

      await useCase.execute('  tenant-1  ', {
        ...validRecipeInput,
        observations: '  Aplicar con viento menor a 10 km/h  ',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          observations: 'Aplicar con viento menor a 10 km/h',
        }),
      );
    });
  });

  describe('FindRecipeUseCase', () => {
    let repository: jest.Mocked<RecipeRepositoryPort>;
    let useCase: FindRecipeUseCase;

    beforeEach(() => {
      repository = createRepository();
      useCase = new FindRecipeUseCase(repository);
    });

    it('returns a recipe of the current tenant with its items in loading order', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseRecipe);

      await expect(useCase.execute('recipe-1', 'tenant-1')).resolves.toEqual(
        baseRecipe,
      );

      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'recipe-1',
        'tenant-1',
      );
    });

    it('rejects a recipe outside the current tenant', async () => {
      repository.findByIdForTenant.mockResolvedValue(null);

      await expect(
        useCase.execute('recipe-1', 'tenant-2'),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it.each([
      ['an empty recipe id', '', 'tenant-1'],
      ['an empty tenant id', 'recipe-1', ''],
    ])('rejects %s without hitting the repository', async (_label, id, tenantId) => {
      const repository = createRepository();
      const useCase = new FindRecipeUseCase(repository);

      await expect(useCase.execute(id, tenantId)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
      expect(repository.findByIdForTenant).not.toHaveBeenCalled();
    });
  });

  describe('FindRecipesByLotUseCase', () => {
    let repository: jest.Mocked<RecipeRepositoryPort>;
    let useCase: FindRecipesByLotUseCase;

    beforeEach(() => {
      repository = createRepository();
      useCase = new FindRecipesByLotUseCase(repository);
    });

    it('returns the recipes of a lot scoped to the current tenant', async () => {
      repository.findAllByLotForTenant.mockResolvedValue([baseRecipe]);

      await expect(useCase.execute('lot-1', 'tenant-1')).resolves.toEqual([
        baseRecipe,
      ]);

      expect(repository.findAllByLotForTenant).toHaveBeenCalledWith(
        'lot-1',
        'tenant-1',
      );
    });

    it('returns an empty list when the lot has no recipes', async () => {
      repository.findAllByLotForTenant.mockResolvedValue([]);

      await expect(useCase.execute('lot-2', 'tenant-1')).resolves.toEqual([]);
      expect(repository.findAllByLotForTenant).toHaveBeenCalledWith(
        'lot-2',
        'tenant-1',
      );
    });

    it.each([
      ['an empty lot id', '', 'tenant-1'],
      ['an empty tenant id', 'lot-1', ''],
    ])('rejects %s without hitting the repository', async (_label, lotId, tenantId) => {
      const repository = createRepository();
      const useCase = new FindRecipesByLotUseCase(repository);

      await expect(useCase.execute(lotId, tenantId)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
      expect(repository.findAllByLotForTenant).not.toHaveBeenCalled();
    });
  });
});
