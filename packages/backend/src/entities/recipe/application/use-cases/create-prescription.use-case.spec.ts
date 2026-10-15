import {
  DuplicateEntityError,
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
  CreateRecipeInput,
  RecipeRecord,
  TaskPrescriptionContext,
} from '../recipe.types';
import { CreatePrescriptionUseCase } from './create-prescription.use-case';

const taskContext: TaskPrescriptionContext = {
  id: 'task-1',
  lotId: 'lot-1',
  status: 'PENDIENTE',
  taskTypeRequiresPrescription: true,
  lotArea: 10,
};

const attachedRecord: RecipeRecord = {
  id: 'recipe-1',
  lotId: 'lot-1',
  taskId: 'task-1',
  date: new Date('2026-03-01T00:00:00.000Z'),
  status: 'ACTIVA',
  pest: 'Malezas de hoja ancha',
  crop: 'Soja',
  observations: null,
  sprayVolume: 120,
  sprayVolumeUnit: 'L/ha',
  reapplicationIntervalDays: 15,
  reapplicationDate: new Date('2026-03-20T00:00:00.000Z'),
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
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

const validInput: CreateRecipeInput = {
  taskId: 'task-1',
  date: '2026-03-01T00:00:00.000Z',
  pest: 'Malezas de hoja ancha',
  crop: 'Soja',
  sprayVolume: 120,
  sprayVolumeUnit: 'L/ha',
  reapplicationIntervalDays: 15,
  reapplicationDate: '2026-03-20T00:00:00.000Z',
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

describe('CreatePrescriptionUseCase', () => {
  let repository: jest.Mocked<RecipeRepositoryPort>;
  let taskPrescription: jest.Mocked<TaskPrescriptionPort>;
  let inputReader: jest.Mocked<RecipeInputReaderPort>;
  let useCase: CreatePrescriptionUseCase;

  beforeEach(() => {
    repository = createRepository();
    taskPrescription = createTaskPrescription();
    inputReader = createInputReader();

    repository.findByTaskId.mockResolvedValue(null);
    taskPrescription.findContextByIdForTenant.mockResolvedValue(taskContext);
    taskPrescription.attachPrescription.mockResolvedValue(attachedRecord);
    inputReader.findExistingIdsForTenant.mockResolvedValue([
      'input-1',
      'input-2',
    ]);

    useCase = new CreatePrescriptionUseCase(
      repository,
      taskPrescription,
      inputReader,
    );
  });

  it.each([
    ['a missing task id', { ...validInput, taskId: undefined }],
    ['an empty task id', { ...validInput, taskId: '   ' }],
    ['an invalid date', { ...validInput, date: 'not-a-date' }],
    [
      'a pest that is not text',
      { ...validInput, pest: 42 as unknown as string },
    ],
    ['too long a pest', { ...validInput, pest: 'x'.repeat(121) }],
    ['a zero spray volume', { ...validInput, sprayVolume: 0 }],
    ['a negative spray volume', { ...validInput, sprayVolume: -1 }],
    ['a non numeric spray volume', { ...validInput, sprayVolume: '120' }],
    ['a missing spray volume unit', { ...validInput, sprayVolumeUnit: '  ' }],
    [
      'a non positive reapplication interval',
      { ...validInput, reapplicationIntervalDays: 0 },
    ],
    [
      'a reapplication date before the prescription date',
      { ...validInput, reapplicationDate: '2026-02-01T00:00:00.000Z' },
    ],
    ['an empty item list', { ...validInput, items: [] }],
    [
      'a zero dose',
      {
        ...validInput,
        items: [{ inputId: 'input-1', dose: 0, loadOrder: 1 }],
      },
    ],
    [
      'a repeated load order',
      {
        ...validInput,
        items: [
          { inputId: 'input-1', dose: 2, loadOrder: 1 },
          { inputId: 'input-2', dose: 3, loadOrder: 1 },
        ],
      },
    ],
    [
      'an invalid dosage basis',
      {
        ...validInput,
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
  ])('rejects %s before touching any port', async (_label, input) => {
    await expect(
      useCase.execute('tenant-1', input as CreateRecipeInput),
    ).rejects.toBeInstanceOf(InvalidInputError);

    expect(
      taskPrescription.findContextByIdForTenant,
    ).not.toHaveBeenCalled();
    expect(repository.findByTaskId).not.toHaveBeenCalled();
    expect(inputReader.findExistingIdsForTenant).not.toHaveBeenCalled();
    expect(taskPrescription.attachPrescription).not.toHaveBeenCalled();
  });

  it('rejects an unknown or deleted task with a not-found error', async () => {
    taskPrescription.findContextByIdForTenant.mockResolvedValue(null);

    await expect(
      useCase.execute('tenant-1', validInput),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    expect(taskPrescription.findContextByIdForTenant).toHaveBeenCalledWith(
      'task-1',
      'tenant-1',
    );
    expect(repository.findByTaskId).not.toHaveBeenCalled();
    expect(taskPrescription.attachPrescription).not.toHaveBeenCalled();
  });

  it('rejects a lot that does not match the task lot', async () => {
    await expect(
      useCase.execute('tenant-1', { ...validInput, lotId: 'lot-2' }),
    ).rejects.toBeInstanceOf(InvalidRelationError);

    expect(taskPrescription.attachPrescription).not.toHaveBeenCalled();
  });

  it('rejects a prescription for a task that already started', async () => {
    taskPrescription.findContextByIdForTenant.mockResolvedValue({
      ...taskContext,
      status: 'EN_PROGRESO',
    });

    await expect(
      useCase.execute('tenant-1', validInput),
    ).rejects.toBeInstanceOf(PrescriptionFrozenError);

    expect(taskPrescription.attachPrescription).not.toHaveBeenCalled();
  });

  it('rejects a second prescription for the same task', async () => {
    repository.findByTaskId.mockResolvedValue(attachedRecord);

    await expect(
      useCase.execute('tenant-1', validInput),
    ).rejects.toBeInstanceOf(DuplicateEntityError);

    expect(taskPrescription.attachPrescription).not.toHaveBeenCalled();
  });

  it('rejects items whose inputs do not belong to the tenant', async () => {
    inputReader.findExistingIdsForTenant.mockResolvedValue(['input-1']);

    await expect(
      useCase.execute('tenant-1', validInput),
    ).rejects.toBeInstanceOf(InvalidRelationError);

    expect(inputReader.findExistingIdsForTenant).toHaveBeenCalledWith(
      ['input-1', 'input-2'],
      'tenant-1',
    );
    expect(taskPrescription.attachPrescription).not.toHaveBeenCalled();
  });

  it('attaches the prescription atomically and returns the computed totals', async () => {
    await expect(useCase.execute('tenant-1', validInput)).resolves.toEqual({
      ...attachedRecord,
      caldoTotal: 1200,
      items: [
        { ...attachedRecord.items[0], total: 30 },
        { ...attachedRecord.items[1], total: 24 },
      ],
    });

    expect(taskPrescription.attachPrescription).toHaveBeenCalledWith({
      taskId: 'task-1',
      lotId: 'lot-1',
      date: new Date('2026-03-01T00:00:00.000Z'),
      status: 'ACTIVA',
      pest: 'Malezas de hoja ancha',
      crop: 'Soja',
      observations: null,
      sprayVolume: 120,
      sprayVolumeUnit: 'L/ha',
      reapplicationIntervalDays: 15,
      reapplicationDate: new Date('2026-03-20T00:00:00.000Z'),
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
    });
  });

  it('allows a prescription on a task type that does not require one', async () => {
    taskPrescription.findContextByIdForTenant.mockResolvedValue({
      ...taskContext,
      taskTypeRequiresPrescription: false,
    });

    await expect(useCase.execute('tenant-1', validInput)).resolves.toEqual(
      expect.objectContaining({ caldoTotal: 1200 }),
    );

    expect(taskPrescription.attachPrescription).toHaveBeenCalledTimes(1);
  });

  it('defaults the dosage basis to POR_HECTAREA when a row omits it', async () => {
    await useCase.execute('tenant-1', {
      ...validInput,
      items: [{ inputId: 'input-1', dose: 3, loadOrder: 1 }],
    });

    expect(taskPrescription.attachPrescription).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ inputId: 'input-1', loadOrder: 1 }),
        ],
      }),
    );

    const [attachData] = taskPrescription.attachPrescription.mock.calls[0];
    expect(attachData.items[0].dosageBasis).toBeUndefined();
  });
});
