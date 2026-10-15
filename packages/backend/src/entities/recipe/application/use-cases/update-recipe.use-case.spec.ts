import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
  PrescriptionFrozenError,
} from '../../domain/errors';
import {
  RecipeInputReaderPort,
  RecipeRepositoryPort,
  TaskPrescriptionPort,
} from '../recipe.ports';
import {
  RecipeRecord,
  TaskPrescriptionContext,
  UpdateRecipeInput,
} from '../recipe.types';
import { UpdateRecipeUseCase } from './update-recipe.use-case';

const taskContext: TaskPrescriptionContext = {
  id: 'task-1',
  lotId: 'lot-1',
  status: 'PENDIENTE',
  taskTypeRequiresPrescription: true,
  lotArea: 10,
};

const storedRecipe: RecipeRecord = {
  id: 'recipe-1',
  lotId: 'lot-1',
  taskId: 'task-1',
  date: new Date('2026-03-01T00:00:00.000Z'),
  status: 'ACTIVA',
  pest: null,
  crop: null,
  observations: null,
  sprayVolume: 100,
  sprayVolumeUnit: 'L/ha',
  reapplicationIntervalDays: null,
  reapplicationDate: null,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  lotArea: 10,
  items: [
    {
      id: 'item-1',
      recipeId: 'recipe-1',
      inputId: 'input-1',
      dose: 3,
      dosageBasis: 'POR_HECTAREA',
      unit: 'L',
      loadOrder: 1,
    },
  ],
};

const updatedRecord: RecipeRecord = {
  ...storedRecipe,
  pest: 'Roya',
  crop: 'Trigo',
  sprayVolume: 120,
  items: [
    {
      id: 'item-1',
      recipeId: 'recipe-1',
      inputId: 'input-1',
      dose: 3,
      dosageBasis: 'POR_HECTAREA',
      unit: 'L',
      loadOrder: 1,
    },
    {
      id: 'item-2',
      recipeId: 'recipe-1',
      inputId: 'input-2',
      dose: 2,
      dosageBasis: 'CONCENTRACION',
      unit: 'L',
      loadOrder: 2,
    },
  ],
};

const validUpdate: UpdateRecipeInput = {
  date: '2026-03-01T00:00:00.000Z',
  pest: 'Roya',
  crop: 'Trigo',
  sprayVolume: 120,
  sprayVolumeUnit: 'L/ha',
  items: [
    {
      inputId: 'input-2',
      dose: 2,
      dosageBasis: 'CONCENTRACION',
      unit: 'L',
      loadOrder: 2,
    },
    {
      inputId: 'input-1',
      dose: 3,
      dosageBasis: 'POR_HECTAREA',
      unit: 'L',
      loadOrder: 1,
    },
  ],
};

function createRepository(): jest.Mocked<RecipeRepositoryPort> {
  return {
    create: jest.fn(),
    update: jest.fn(),
    findByIdForTenant: jest.fn(),
    findByTaskId: jest.fn(),
    findAllByLotForTenant: jest.fn(),
  };
}

function createTaskPrescription(): jest.Mocked<TaskPrescriptionPort> {
  return {
    findContextByIdForTenant: jest.fn(),
    attachPrescription: jest.fn(),
  };
}

function createInputReader(): jest.Mocked<RecipeInputReaderPort> {
  return {
    findExistingIdsForTenant: jest.fn(),
  };
}

describe('UpdateRecipeUseCase', () => {
  let repository: jest.Mocked<RecipeRepositoryPort>;
  let taskPrescription: jest.Mocked<TaskPrescriptionPort>;
  let inputReader: jest.Mocked<RecipeInputReaderPort>;
  let useCase: UpdateRecipeUseCase;

  beforeEach(() => {
    repository = createRepository();
    taskPrescription = createTaskPrescription();
    inputReader = createInputReader();

    repository.findByIdForTenant.mockResolvedValue(storedRecipe);
    repository.update.mockResolvedValue(updatedRecord);
    taskPrescription.findContextByIdForTenant.mockResolvedValue(taskContext);
    inputReader.findExistingIdsForTenant.mockResolvedValue([
      'input-1',
      'input-2',
    ]);

    useCase = new UpdateRecipeUseCase(
      repository,
      taskPrescription,
      inputReader,
    );
  });

  it.each([
    ['an empty recipe id', '', 'tenant-1'],
    ['an empty tenant id', 'recipe-1', ''],
  ])('rejects %s without hitting the repository', async (_label, id, tenant) => {
    await expect(useCase.execute(id, tenant, validUpdate)).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(repository.findByIdForTenant).not.toHaveBeenCalled();
  });

  it('rejects an unknown recipe with a not-found error', async () => {
    repository.findByIdForTenant.mockResolvedValue(null);

    await expect(
      useCase.execute('recipe-1', 'tenant-1', validUpdate),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    expect(taskPrescription.findContextByIdForTenant).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects the edit once the task has started', async () => {
    taskPrescription.findContextByIdForTenant.mockResolvedValue({
      ...taskContext,
      status: 'FINALIZADA',
    });

    await expect(
      useCase.execute('recipe-1', 'tenant-1', validUpdate),
    ).rejects.toBeInstanceOf(PrescriptionFrozenError);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects an edit whose recipe lot does not match the task lot', async () => {
    taskPrescription.findContextByIdForTenant.mockResolvedValue({
      ...taskContext,
      lotId: 'lot-2',
    });

    await expect(
      useCase.execute('recipe-1', 'tenant-1', validUpdate),
    ).rejects.toBeInstanceOf(InvalidRelationError);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it.each([
    ['a zero spray volume', { ...validUpdate, sprayVolume: 0 }],
    ['a missing spray volume unit', { ...validUpdate, sprayVolumeUnit: '  ' }],
    ['an empty item list', { ...validUpdate, items: [] }],
    [
      'an invalid dosage basis',
      {
        ...validUpdate,
        items: [
          {
            inputId: 'input-1',
            dose: 2,
            dosageBasis: 'POR_LITRO' as never,
            loadOrder: 1,
          },
        ],
      },
    ],
  ])('revalidates and rejects %s', async (_label, input) => {
    await expect(
      useCase.execute('recipe-1', 'tenant-1', input as UpdateRecipeInput),
    ).rejects.toBeInstanceOf(InvalidInputError);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects items whose inputs do not belong to the tenant', async () => {
    inputReader.findExistingIdsForTenant.mockResolvedValue(['input-1']);

    await expect(
      useCase.execute('recipe-1', 'tenant-1', validUpdate),
    ).rejects.toBeInstanceOf(InvalidRelationError);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('updates the recipe and returns the recomputed totals', async () => {
    await expect(
      useCase.execute('recipe-1', 'tenant-1', validUpdate),
    ).resolves.toEqual({
      ...updatedRecord,
      caldoTotal: 1200,
      items: [
        { ...updatedRecord.items[0], total: 30 },
        { ...updatedRecord.items[1], total: 24 },
      ],
    });

    expect(repository.update).toHaveBeenCalledWith(
      'recipe-1',
      'tenant-1',
      expect.objectContaining({
        date: new Date('2026-03-01T00:00:00.000Z'),
        pest: 'Roya',
        crop: 'Trigo',
        sprayVolume: 120,
        sprayVolumeUnit: 'L/ha',
        items: [
          {
            inputId: 'input-1',
            dose: 3,
            dosageBasis: 'POR_HECTAREA',
            unit: 'L',
            loadOrder: 1,
          },
          {
            inputId: 'input-2',
            dose: 2,
            dosageBasis: 'CONCENTRACION',
            unit: 'L',
            loadOrder: 2,
          },
        ],
      }),
    );
  });

  it('never forwards a task change to the repository', async () => {
    await useCase.execute('recipe-1', 'tenant-1', {
      ...validUpdate,
      taskId: 'task-9',
    } as UpdateRecipeInput & { taskId: string });

    const [, , data] = repository.update.mock.calls[0];
    expect(data).not.toHaveProperty('taskId');
    expect(repository.findByIdForTenant).toHaveBeenCalledWith(
      'recipe-1',
      'tenant-1',
    );
  });

  it('keeps the stored values for the fields the request omits', async () => {
    await useCase.execute('recipe-1', 'tenant-1', { sprayVolume: 200 });

    expect(repository.update).toHaveBeenCalledWith(
      'recipe-1',
      'tenant-1',
      expect.objectContaining({
        date: storedRecipe.date,
        pest: null,
        crop: null,
        observations: null,
        sprayVolume: 200,
        sprayVolumeUnit: 'L/ha',
      }),
    );
  });

  it('updates a taskless recipe without consulting the task side', async () => {
    repository.findByIdForTenant.mockResolvedValue({
      ...storedRecipe,
      taskId: null,
    });
    repository.update.mockResolvedValue({
      ...updatedRecord,
      taskId: null,
    });

    await expect(
      useCase.execute('recipe-1', 'tenant-1', validUpdate),
    ).resolves.toEqual(
      expect.objectContaining({ caldoTotal: 1200 }),
    );

    expect(taskPrescription.findContextByIdForTenant).not.toHaveBeenCalled();
  });
});
