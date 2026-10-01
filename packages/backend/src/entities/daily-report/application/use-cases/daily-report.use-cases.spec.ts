import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import {
  DailyReportCompanyReaderPort,
  DailyReportInputReaderPort,
  DailyReportRepositoryPort,
  DailyReportTaskReaderPort,
} from '../daily-report.ports';
import {
  CreateDailyReportInput,
  CreateDailyReportItemInput,
  DailyReportRecord,
} from '../daily-report.types';
import { CreateDailyReportUseCase } from './create-daily-report.use-case';
import { FindDailyReportUseCase } from './find-daily-report.use-case';
import { FindDailyReportsByCompanyUseCase } from './find-daily-reports-by-company.use-case';

const baseReport: DailyReportRecord = {
  id: 'report-1',
  operatorId: 'user-1',
  companyId: 'company-1',
  taskId: 'task-1',
  lotId: 'lot-1',
  taskTypeId: 'task-type-1',
  date: new Date('2026-03-01T00:00:00.000Z'),
  hectares: 12.5,
  hours: 6,
  status: 'PENDIENTE_APROBACION',
  rejectionReason: null,
  approvedAt: null,
  approvedBy: null,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  items: [
    {
      id: 'item-1',
      dailyReportId: 'report-1',
      inputId: 'input-1',
      quantity: 10,
      unit: 'L',
    },
    {
      id: 'item-2',
      dailyReportId: 'report-1',
      inputId: 'input-2',
      quantity: 4,
      unit: 'kg',
    },
  ],
};

const validInput: CreateDailyReportInput = {
  operatorId: 'user-1',
  taskId: 'task-1',
  date: '2026-03-01T00:00:00.000Z',
  hectares: 12.5,
  hours: 6,
  items: [
    { inputId: 'input-1', quantity: 10, unit: 'L' },
    { inputId: 'input-2', quantity: 4, unit: 'kg' },
  ],
};

function createRepository(): jest.Mocked<DailyReportRepositoryPort> {
  return {
    create: jest.fn(),
    findByIdForCompany: jest.fn(),
    findAllByCompany: jest.fn(),
  };
}

function createCompanyReader(): jest.Mocked<DailyReportCompanyReaderPort> {
  return { findById: jest.fn() };
}

function createTaskReader(): jest.Mocked<DailyReportTaskReaderPort> {
  return { findByIdWithScope: jest.fn() };
}

function createInputReader(): jest.Mocked<DailyReportInputReaderPort> {
  return { findExistingIdsForTenant: jest.fn() };
}

describe('Daily report use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/daily-report');
    const files = [
      'domain/errors.ts',
      'domain/daily-report-status.ts',
      'domain/daily-report.rules.ts',
      'application/daily-report.ports.ts',
      'application/daily-report.types.ts',
      'application/daily-report.validation.ts',
      'application/use-cases/create-daily-report.use-case.ts',
      'application/use-cases/approve-daily-report.use-case.ts',
      'application/use-cases/find-daily-report.use-case.ts',
      'application/use-cases/find-daily-reports-by-company.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('CreateDailyReportUseCase', () => {
    let repository: jest.Mocked<DailyReportRepositoryPort>;
    let companyReader: jest.Mocked<DailyReportCompanyReaderPort>;
    let taskReader: jest.Mocked<DailyReportTaskReaderPort>;
    let inputReader: jest.Mocked<DailyReportInputReaderPort>;
    let useCase: CreateDailyReportUseCase;

    beforeEach(() => {
      repository = createRepository();
      companyReader = createCompanyReader();
      taskReader = createTaskReader();
      inputReader = createInputReader();
      companyReader.findById.mockResolvedValue({
        id: 'company-1',
        tenantId: 'tenant-1',
      });
      taskReader.findByIdWithScope.mockResolvedValue({
        id: 'task-1',
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        tenantId: 'tenant-1',
      });
      inputReader.findExistingIdsForTenant.mockResolvedValue([
        'input-1',
        'input-2',
      ]);
      useCase = new CreateDailyReportUseCase(
        repository,
        companyReader,
        taskReader,
        inputReader,
      );
    });

    const invalidInputCases: Array<[string, string, CreateDailyReportInput]> = [
      ['an empty company id', '  ', validInput],
      ['an empty operator id', 'company-1', { ...validInput, operatorId: '' }],
      ['an empty task id', 'company-1', { ...validInput, taskId: '  ' }],
      ['an empty id', 'company-1', { ...validInput, id: '' }],
      ['a whitespace id', 'company-1', { ...validInput, id: '   ' }],
      ['an invalid date', 'company-1', { ...validInput, date: 'not-a-date' }],
      ['a zero hectares value', 'company-1', { ...validInput, hectares: 0 }],
      ['a negative hectares value', 'company-1', { ...validInput, hectares: -1 }],
      ['a zero hours value', 'company-1', { ...validInput, hours: 0 }],
      ['a negative hours value', 'company-1', { ...validInput, hours: -2 }],
      ['a non finite hours value', 'company-1', { ...validInput, hours: Number.NaN }],
      ['an empty item list', 'company-1', { ...validInput, items: [] }],
      [
        'a zero item quantity',
        'company-1',
        {
          ...validInput,
          items: [{ inputId: 'input-1', quantity: 0, unit: 'L' }],
        },
      ],
      [
        'a negative item quantity',
        'company-1',
        {
          ...validInput,
          items: [{ inputId: 'input-1', quantity: -3, unit: 'L' }],
        },
      ],
      [
        'a missing item unit',
        'company-1',
        { ...validInput, items: [{ inputId: 'input-1', quantity: 3 }] },
      ],
      [
        'an empty item unit',
        'company-1',
        {
          ...validInput,
          items: [{ inputId: 'input-1', quantity: 3, unit: '   ' }],
        },
      ],
      [
        'an empty item input id',
        'company-1',
        {
          ...validInput,
          items: [{ inputId: '', quantity: 3, unit: 'L' }],
        },
      ],
      [
        'two items that reference the same input',
        'company-1',
        {
          ...validInput,
          items: [
            { inputId: 'input-1', quantity: 3, unit: 'L' },
            { inputId: 'input-1', quantity: 5, unit: 'L' },
          ],
        },
      ],
    ];

    it.each(invalidInputCases)(
      'rejects %s before touching any port',
      async (_label, companyId, input) => {
        await expect(
          useCase.execute(companyId, input),
        ).rejects.toBeInstanceOf(InvalidInputError);

        expect(companyReader.findById).not.toHaveBeenCalled();
        expect(taskReader.findByIdWithScope).not.toHaveBeenCalled();
        expect(inputReader.findExistingIdsForTenant).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['a missing date', { ...validInput, date: undefined as unknown as string }],
      [
        'a non numeric hectares value',
        { ...validInput, hectares: '12.5' as unknown as number },
      ],
      [
        'a missing item quantity',
        {
          ...validInput,
          items: [
            { inputId: 'input-1', unit: 'L' } as unknown as CreateDailyReportItemInput,
          ],
        },
      ],
    ] as Array<[string, CreateDailyReportInput]>)(
      'rejects %s before touching any port',
      async (_label, input) => {
        await expect(
          useCase.execute('company-1', input),
        ).rejects.toBeInstanceOf(InvalidInputError);

        expect(companyReader.findById).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it('rejects a non array item list', async () => {
      await expect(
        useCase.execute('company-1', {
          ...validInput,
          items: undefined,
        } as unknown as CreateDailyReportInput),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a company id that does not exist before reading the task', async () => {
      companyReader.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('company-9', validInput),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(companyReader.findById).toHaveBeenCalledWith('company-9');
      expect(taskReader.findByIdWithScope).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a task id that does not exist', async () => {
      taskReader.findByIdWithScope.mockResolvedValue(null);

      await expect(
        useCase.execute('company-1', validInput),
      ).rejects.toBeInstanceOf(EntityNotFoundError);

      expect(taskReader.findByIdWithScope).toHaveBeenCalledWith('task-1');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a task owned by another tenant than the company', async () => {
      taskReader.findByIdWithScope.mockResolvedValue({
        id: 'task-1',
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        tenantId: 'tenant-2',
      });

      await expect(
        useCase.execute('company-1', validInput),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(inputReader.findExistingIdsForTenant).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects items whose inputs do not belong to the company tenant', async () => {
      inputReader.findExistingIdsForTenant.mockResolvedValue(['input-1']);

      await expect(
        useCase.execute('company-1', validInput),
      ).rejects.toBeInstanceOf(EntityNotFoundError);

      expect(inputReader.findExistingIdsForTenant).toHaveBeenCalledWith(
        ['input-1', 'input-2'],
        'tenant-1',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('inherits the lot and the task type from the referenced task and starts pending approval', async () => {
      repository.create.mockResolvedValue(baseReport);

      await expect(
        useCase.execute('company-1', validInput),
      ).resolves.toEqual(baseReport);

      expect(repository.create).toHaveBeenCalledWith({
        operatorId: 'user-1',
        companyId: 'company-1',
        taskId: 'task-1',
        lotId: 'lot-1',
        taskTypeId: 'task-type-1',
        date: new Date('2026-03-01T00:00:00.000Z'),
        hectares: 12.5,
        hours: 6,
        status: 'PENDIENTE_APROBACION',
        items: [
          { inputId: 'input-1', quantity: 10, unit: 'L' },
          { inputId: 'input-2', quantity: 4, unit: 'kg' },
        ],
      });
      expect(companyReader.findById).toHaveBeenCalledWith('company-1');
      expect(taskReader.findByIdWithScope).toHaveBeenCalledWith('task-1');
    });

    it('passes a client-provided id through to the repository', async () => {
      repository.create.mockResolvedValue({
        ...baseReport,
        id: 'client-uuid-1',
      });

      await expect(
        useCase.execute('company-1', { ...validInput, id: 'client-uuid-1' }),
      ).resolves.toMatchObject({ id: 'client-uuid-1' });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'client-uuid-1',
          lotId: 'lot-1',
          taskTypeId: 'task-type-1',
          status: 'PENDIENTE_APROBACION',
        }),
      );
    });

    it('does not pass an id when the client omits it', async () => {
      repository.create.mockResolvedValue(baseReport);

      await useCase.execute('company-1', validInput);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: undefined,
          lotId: 'lot-1',
          taskTypeId: 'task-type-1',
        }),
      );
    });

    it('trims the scope, the operator, the item units and the client id before persisting', async () => {
      repository.create.mockResolvedValue(baseReport);

      await useCase.execute('  company-1  ', {
        ...validInput,
        operatorId: '  user-1  ',
        taskId: '  task-1  ',
        items: [
          { inputId: '  input-1  ', quantity: 10, unit: '  L  ' },
          { inputId: 'input-2', quantity: 4, unit: 'kg' },
        ],
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-1',
          operatorId: 'user-1',
          taskId: 'task-1',
          items: [
            { inputId: 'input-1', quantity: 10, unit: 'L' },
            { inputId: 'input-2', quantity: 4, unit: 'kg' },
          ],
        }),
      );
    });
  });

  describe('FindDailyReportUseCase', () => {
    let repository: jest.Mocked<DailyReportRepositoryPort>;
    let useCase: FindDailyReportUseCase;

    beforeEach(() => {
      repository = createRepository();
      useCase = new FindDailyReportUseCase(repository);
    });

    it('returns a report of the current company with its items', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseReport);

      await expect(
        useCase.execute('report-1', 'company-1'),
      ).resolves.toEqual(baseReport);

      expect(repository.findByIdForCompany).toHaveBeenCalledWith(
        'report-1',
        'company-1',
      );
    });

    it('rejects a report outside the current company', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(
        useCase.execute('report-1', 'company-2'),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it.each([
      ['an empty report id', '', 'company-1'],
      ['an empty company id', 'report-1', ''],
    ])(
      'rejects %s without hitting the repository',
      async (_label, id, companyId) => {
        await expect(useCase.execute(id, companyId)).rejects.toBeInstanceOf(
          InvalidInputError,
        );
        expect(repository.findByIdForCompany).not.toHaveBeenCalled();
      },
    );
  });

  describe('FindDailyReportsByCompanyUseCase', () => {
    let repository: jest.Mocked<DailyReportRepositoryPort>;
    let useCase: FindDailyReportsByCompanyUseCase;

    beforeEach(() => {
      repository = createRepository();
      useCase = new FindDailyReportsByCompanyUseCase(repository);
    });

    it('returns the reports of the current company', async () => {
      repository.findAllByCompany.mockResolvedValue([baseReport]);

      await expect(useCase.execute('company-1')).resolves.toEqual([
        baseReport,
      ]);

      expect(repository.findAllByCompany).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list when the company has no reports', async () => {
      repository.findAllByCompany.mockResolvedValue([]);

      await expect(useCase.execute('company-2')).resolves.toEqual([]);
      expect(repository.findAllByCompany).toHaveBeenCalledWith('company-2');
    });

    it('rejects an empty company id without hitting the repository', async () => {
      await expect(useCase.execute('  ')).rejects.toBeInstanceOf(
        InvalidInputError,
      );
      expect(repository.findAllByCompany).not.toHaveBeenCalled();
    });
  });
});
