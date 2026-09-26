import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import {
  ClockPort,
  MachineActivityRepositoryPort,
  MachineReaderPort,
} from '../machine-activity.ports';
import {
  MachineActivityRecord,
  RegisterMachineActivityInput,
} from '../machine-activity.types';
import { FindAllMachineActivitiesUseCase } from './find-all-machine-activities.use-case';
import { FindMachineActivityUseCase } from './find-machine-activity.use-case';
import { RegisterMachineActivityUseCase } from './register-machine-activity.use-case';

const now = new Date('2026-03-10T12:00:00.000Z');
const activityDate = '2026-03-09T08:00:00.000Z';

const baseRecord: MachineActivityRecord = {
  id: 'activity-1',
  machineId: 'machine-1',
  companyId: 'company-1',
  type: 'COMBUSTIBLE',
  date: new Date(activityDate),
  liters: 120,
  receipt: 'A-0001',
  cost: null,
  spareParts: null,
  usageHours: null,
  hectares: null,
  observations: null,
  createdAt: new Date('2026-03-09T10:00:00.000Z'),
  updatedAt: new Date('2026-03-09T10:00:00.000Z'),
};

const fuelInput: RegisterMachineActivityInput = {
  machineId: 'machine-1',
  type: 'COMBUSTIBLE',
  date: activityDate,
  liters: 120,
  receipt: 'A-0001',
};

function createRepository(): jest.Mocked<MachineActivityRepositoryPort> {
  return {
    create: jest.fn(),
    findByIdForCompany: jest.fn(),
    findAllByCompany: jest.fn(),
  };
}

function createMachineReader(): jest.Mocked<MachineReaderPort> {
  return { findByIdForCompany: jest.fn() };
}

function createClock(): jest.Mocked<ClockPort> {
  return { now: jest.fn() };
}

describe('Machine activity use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/machine-activity');
    const files = [
      'domain/errors.ts',
      'domain/machine-activity-type.ts',
      'domain/machine-activity.rules.ts',
      'application/machine-activity.ports.ts',
      'application/machine-activity.types.ts',
      'application/machine-activity.validation.ts',
      'application/use-cases/register-machine-activity.use-case.ts',
      'application/use-cases/find-machine-activity.use-case.ts',
      'application/use-cases/find-all-machine-activities.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('RegisterMachineActivityUseCase', () => {
    let repository: jest.Mocked<MachineActivityRepositoryPort>;
    let machineReader: jest.Mocked<MachineReaderPort>;
    let clock: jest.Mocked<ClockPort>;
    let useCase: RegisterMachineActivityUseCase;

    beforeEach(() => {
      repository = createRepository();
      machineReader = createMachineReader();
      clock = createClock();
      clock.now.mockReturnValue(now);
      machineReader.findByIdForCompany.mockResolvedValue({ id: 'machine-1' });
      useCase = new RegisterMachineActivityUseCase(
        repository,
        machineReader,
        clock,
      );
    });

    const invalidCases: Array<
      [string, string, RegisterMachineActivityInput]
    > = [
      ['an empty company id', '  ', fuelInput],
      [
        'an empty machine id',
        'company-1',
        { ...fuelInput, machineId: '  ' },
      ],
      [
        'an unknown activity type',
        'company-1',
        {
          ...fuelInput,
          type: 'VIAJE' as RegisterMachineActivityInput['type'],
        },
      ],
      [
        'an invalid date',
        'company-1',
        { ...fuelInput, date: 'not-a-date' },
      ],
      [
        'a future date',
        'company-1',
        { ...fuelInput, date: '2026-03-11T08:00:00.000Z' },
      ],
      [
        'fuel without liters',
        'company-1',
        { ...fuelInput, liters: null },
      ],
      [
        'fuel with zero liters',
        'company-1',
        { ...fuelInput, liters: 0 },
      ],
      [
        'fuel with negative liters',
        'company-1',
        { ...fuelInput, liters: -5 },
      ],
      [
        'maintenance without a cost',
        'company-1',
        {
          machineId: 'machine-1',
          type: 'MANTENIMIENTO',
          date: activityDate,
          spareParts: 'Cambio de bomba',
        },
      ],
      [
        'maintenance without a work description',
        'company-1',
        {
          machineId: 'machine-1',
          type: 'MANTENIMIENTO',
          date: activityDate,
          cost: 50000,
        },
      ],
      [
        'field usage without hectares',
        'company-1',
        {
          machineId: 'machine-1',
          type: 'USO_CAMPO',
          date: activityDate,
          usageHours: 8,
        },
      ],
      [
        'field usage with zero usage hours',
        'company-1',
        {
          machineId: 'machine-1',
          type: 'USO_CAMPO',
          date: activityDate,
          usageHours: 0,
          hectares: 12,
        },
      ],
    ];

    it.each(invalidCases)(
      'rejects %s before touching any port',
      async (_label, companyId, input) => {
        await expect(
          useCase.execute(companyId, input),
        ).rejects.toBeInstanceOf(InvalidInputError);

        expect(machineReader.findByIdForCompany).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['fuel', { ...fuelInput, liters: 'full' as unknown as number }],
      [
        'maintenance',
        {
          machineId: 'machine-1',
          type: 'MANTENIMIENTO' as const,
          date: activityDate,
          cost: 'expensive' as unknown as number,
          spareParts: 'Cambio de bomba',
        },
      ],
    ] as Array<[string, RegisterMachineActivityInput]>)(
      'rejects non numeric amounts for %s before touching any port',
      async (_label, input) => {
        await expect(
          useCase.execute('company-1', input),
        ).rejects.toBeInstanceOf(InvalidInputError);

        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it('rejects a machine that does not belong to the company', async () => {
      machineReader.findByIdForCompany.mockResolvedValue(null);

      await expect(
        useCase.execute('company-1', fuelInput),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(machineReader.findByIdForCompany).toHaveBeenCalledWith(
        'machine-1',
        'company-1',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('persists a fuel activity scoped to the company', async () => {
      repository.create.mockResolvedValue(baseRecord);

      await expect(
        useCase.execute('company-1', fuelInput),
      ).resolves.toEqual(baseRecord);

      expect(repository.create).toHaveBeenCalledWith({
        machineId: 'machine-1',
        companyId: 'company-1',
        type: 'COMBUSTIBLE',
        date: new Date(activityDate),
        liters: 120,
        receipt: 'A-0001',
        cost: null,
        spareParts: null,
        usageHours: null,
        hectares: null,
        observations: null,
      });
      expect(clock.now).toHaveBeenCalled();
    });

    it.each(['COMBUSTIBLE', 'MANTENIMIENTO', 'REPARACION', 'USO_CAMPO'] as const)(
      'persists a %s activity without inventing missing values',
      async (type) => {
        const input: RegisterMachineActivityInput = {
          machineId: 'machine-1',
          type,
          date: activityDate,
          ...(type === 'COMBUSTIBLE' ? { liters: 100 } : {}),
          ...(type === 'MANTENIMIENTO' || type === 'REPARACION'
            ? { cost: 1000, spareParts: 'Trabajo' }
            : {}),
          ...(type === 'USO_CAMPO' ? { usageHours: 4, hectares: 10 } : {}),
        };
        repository.create.mockResolvedValue(baseRecord);

        await useCase.execute('company-1', input);

        expect(repository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type,
            liters: type === 'COMBUSTIBLE' ? 100 : null,
            cost:
              type === 'MANTENIMIENTO' || type === 'REPARACION' ? 1000 : null,
            spareParts:
              type === 'MANTENIMIENTO' || type === 'REPARACION'
                ? 'Trabajo'
                : null,
            usageHours: type === 'USO_CAMPO' ? 4 : null,
            hectares: type === 'USO_CAMPO' ? 10 : null,
          }),
        );
      },
    );

    it('trims the text fields and turns blank optionals into null', async () => {
      repository.create.mockResolvedValue(baseRecord);

      await useCase.execute('  company-1  ', {
        machineId: '  machine-1  ',
        type: 'MANTENIMIENTO',
        date: activityDate,
        cost: 50000,
        spareParts: '  Cambio de bomba  ',
        receipt: '   ',
        observations: '  Cambio programado  ',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-1',
          machineId: 'machine-1',
          spareParts: 'Cambio de bomba',
          receipt: null,
          observations: 'Cambio programado',
        }),
      );
    });
  });

  describe('FindMachineActivityUseCase', () => {
    let repository: jest.Mocked<MachineActivityRepositoryPort>;
    let useCase: FindMachineActivityUseCase;

    beforeEach(() => {
      repository = createRepository();
      useCase = new FindMachineActivityUseCase(repository);
    });

    it('returns an activity of the current company', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseRecord);

      await expect(
        useCase.execute('activity-1', 'company-1'),
      ).resolves.toEqual(baseRecord);

      expect(repository.findByIdForCompany).toHaveBeenCalledWith(
        'activity-1',
        'company-1',
      );
    });

    it('rejects an activity outside the current company', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(
        useCase.execute('activity-1', 'company-2'),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it.each([
      ['an empty activity id', '', 'company-1'],
      ['an empty company id', 'activity-1', ''],
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

  describe('FindAllMachineActivitiesUseCase', () => {
    let repository: jest.Mocked<MachineActivityRepositoryPort>;
    let useCase: FindAllMachineActivitiesUseCase;

    beforeEach(() => {
      repository = createRepository();
      useCase = new FindAllMachineActivitiesUseCase(repository);
    });

    it('returns the activities of the current company', async () => {
      repository.findAllByCompany.mockResolvedValue([baseRecord]);

      await expect(useCase.execute('company-1')).resolves.toEqual([baseRecord]);

      expect(repository.findAllByCompany).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list when the company has no activity', async () => {
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
