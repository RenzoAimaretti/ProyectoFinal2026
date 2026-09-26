import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
  InvalidStateTransitionError,
} from '../../domain/errors';
import {
  ClockPort,
  ReceptionClientReaderPort,
  ReceptionInputReaderPort,
  ReceptionRepositoryPort,
  ReceptionValidationPort,
} from '../reception.ports';
import {
  CreateReceptionInput,
  ReceptionItemValidation,
  ReceptionRecord,
  ValidateReceptionData,
} from '../reception.types';
import { CreateReceptionUseCase } from './create-reception.use-case';
import { FindReceptionUseCase } from './find-reception.use-case';
import { FindReceptionsByClientUseCase } from './find-receptions-by-client.use-case';
import { RejectReceptionUseCase } from './reject-reception.use-case';
import { ValidateReceptionUseCase } from './validate-reception.use-case';

const validationDate = new Date('2026-04-02T09:30:00.000Z');

const baseReception: ReceptionRecord = {
  id: 'reception-1',
  clientId: 'client-1',
  date: new Date('2026-04-01T00:00:00.000Z'),
  status: 'PENDIENTE_VALIDACION',
  rejectionReason: null,
  validatedBy: null,
  validatedAt: null,
  createdAt: new Date('2026-04-01T10:00:00.000Z'),
  updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  items: [
    {
      id: 'item-1',
      receptionId: 'reception-1',
      inputId: 'input-1',
      quantity: 10,
      validatedQuantity: null,
      quantityVariance: null,
      unit: 'L',
    },
    {
      id: 'item-2',
      receptionId: 'reception-1',
      inputId: 'input-2',
      quantity: 4,
      validatedQuantity: null,
      quantityVariance: null,
      unit: 'kg',
    },
  ],
};

const validInput: CreateReceptionInput = {
  date: '2026-04-01T00:00:00.000Z',
  items: [
    { inputId: 'input-1', quantity: 10 },
    { inputId: 'input-2', quantity: 4 },
  ],
};

function createRepository(): jest.Mocked<ReceptionRepositoryPort> {
  return {
    create: jest.fn(),
    findByIdForClient: jest.fn(),
    findAllByClient: jest.fn(),
  };
}

function createValidation(): jest.Mocked<ReceptionValidationPort> {
  return {
    validateWithStock: jest.fn(),
    reject: jest.fn(),
  };
}

function createClientReader(): jest.Mocked<ReceptionClientReaderPort> {
  return { findById: jest.fn() };
}

function createInputReader(): jest.Mocked<ReceptionInputReaderPort> {
  return { findExistingForTenant: jest.fn() };
}

function createClock(): jest.Mocked<ClockPort> {
  return { now: jest.fn().mockReturnValue(validationDate) };
}

describe('Reception use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/reception');
    const files = [
      'domain/errors.ts',
      'domain/reception-status.ts',
      'domain/reception.rules.ts',
      'application/reception.ports.ts',
      'application/reception.types.ts',
      'application/reception.validation.ts',
      'application/use-cases/create-reception.use-case.ts',
      'application/use-cases/validate-reception.use-case.ts',
      'application/use-cases/reject-reception.use-case.ts',
      'application/use-cases/find-reception.use-case.ts',
      'application/use-cases/find-receptions-by-client.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('CreateReceptionUseCase', () => {
    let repository: jest.Mocked<ReceptionRepositoryPort>;
    let clientReader: jest.Mocked<ReceptionClientReaderPort>;
    let inputReader: jest.Mocked<ReceptionInputReaderPort>;
    let useCase: CreateReceptionUseCase;

    beforeEach(() => {
      repository = createRepository();
      clientReader = createClientReader();
      inputReader = createInputReader();
      clientReader.findById.mockResolvedValue({
        id: 'client-1',
        tenantId: 'tenant-1',
      });
      inputReader.findExistingForTenant.mockResolvedValue([
        { id: 'input-1', unit: 'L' },
        { id: 'input-2', unit: 'kg' },
      ]);
      useCase = new CreateReceptionUseCase(
        repository,
        clientReader,
        inputReader,
      );
    });

    const invalidInputCases: Array<[string, string, CreateReceptionInput]> = [
      ['an empty client id', '  ', validInput],
      ['an invalid date', 'client-1', { ...validInput, date: 'not-a-date' }],
      ['an empty item list', 'client-1', { ...validInput, items: [] }],
      [
        'a zero item quantity',
        'client-1',
        { ...validInput, items: [{ inputId: 'input-1', quantity: 0 }] },
      ],
      [
        'a negative item quantity',
        'client-1',
        { ...validInput, items: [{ inputId: 'input-1', quantity: -2 }] },
      ],
      [
        'an empty item input id',
        'client-1',
        { ...validInput, items: [{ inputId: '  ', quantity: 2 }] },
      ],
      [
        'two items that reference the same input',
        'client-1',
        {
          ...validInput,
          items: [
            { inputId: 'input-1', quantity: 2 },
            { inputId: 'input-1', quantity: 5 },
          ],
        },
      ],
    ];

    it.each(invalidInputCases)(
      'rejects %s before touching any port',
      async (_label, clientId, input) => {
        await expect(useCase.execute(clientId, input)).rejects.toBeInstanceOf(
          InvalidInputError,
        );

        expect(clientReader.findById).not.toHaveBeenCalled();
        expect(inputReader.findExistingForTenant).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['a missing date', { ...validInput, date: undefined as unknown as string }],
      [
        'a non numeric item quantity',
        {
          ...validInput,
          items: [{ inputId: 'input-1', quantity: '3' }] as unknown as CreateReceptionInput['items'],
        },
      ],
    ] as Array<[string, CreateReceptionInput]>)(
      'rejects %s before touching any port',
      async (_label, input) => {
        await expect(
          useCase.execute('client-1', input),
        ).rejects.toBeInstanceOf(InvalidInputError);

        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it('rejects a non array item list', async () => {
      await expect(
        useCase.execute('client-1', {
          ...validInput,
          items: undefined,
        } as unknown as CreateReceptionInput),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a client that does not exist', async () => {
      clientReader.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('client-9', validInput),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(clientReader.findById).toHaveBeenCalledWith('client-9');
      expect(inputReader.findExistingForTenant).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects items whose inputs are not in the catalogue of the client tenant', async () => {
      inputReader.findExistingForTenant.mockResolvedValue([
        { id: 'input-1', unit: 'L' },
      ]);

      await expect(
        useCase.execute('client-1', validInput),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(inputReader.findExistingForTenant).toHaveBeenCalledWith(
        ['input-1', 'input-2'],
        'tenant-1',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('always creates the reception pending validation with the catalogue units', async () => {
      repository.create.mockResolvedValue(baseReception);

      await expect(
        useCase.execute('client-1', {
          ...validInput,
          status: 'VALIDADA',
        } as unknown as CreateReceptionInput),
      ).resolves.toEqual(baseReception);

      expect(repository.create).toHaveBeenCalledWith({
        clientId: 'client-1',
        date: new Date('2026-04-01T00:00:00.000Z'),
        status: 'PENDIENTE_VALIDACION',
        items: [
          { inputId: 'input-1', quantity: 10, unit: 'L' },
          { inputId: 'input-2', quantity: 4, unit: 'kg' },
        ],
      });
    });

    it('records only the expected quantity at creation and drops any validated one', async () => {
      repository.create.mockResolvedValue(baseReception);

      await useCase.execute('client-1', {
        ...validInput,
        items: [
          { inputId: 'input-1', quantity: 10, validatedQuantity: 3 },
          { inputId: 'input-2', quantity: 4, validatedQuantity: 4 },
        ],
      } as unknown as CreateReceptionInput);

      expect(repository.create).toHaveBeenCalledWith({
        clientId: 'client-1',
        date: new Date('2026-04-01T00:00:00.000Z'),
        status: 'PENDIENTE_VALIDACION',
        items: [
          { inputId: 'input-1', quantity: 10, unit: 'L' },
          { inputId: 'input-2', quantity: 4, unit: 'kg' },
        ],
      });
    });
  });

  describe('ValidateReceptionUseCase', () => {
    let repository: jest.Mocked<ReceptionRepositoryPort>;
    let validation: jest.Mocked<ReceptionValidationPort>;
    let clock: jest.Mocked<ClockPort>;
    let useCase: ValidateReceptionUseCase;

    const agreedItems: ReceptionItemValidation[] = [
      { inputId: 'input-1', validatedQuantity: 8 },
      { inputId: 'input-2', validatedQuantity: 4 },
    ];

    beforeEach(() => {
      repository = createRepository();
      validation = createValidation();
      clock = createClock();
      useCase = new ValidateReceptionUseCase(repository, validation, clock);
      repository.findByIdForClient.mockResolvedValue(baseReception);
    });

    it.each([
      ['an empty client id', '  ', 'reception-1', 'user-1'],
      ['an empty reception id', 'client-1', '  ', 'user-1'],
      ['an empty validator id', 'client-1', 'reception-1', '  '],
    ])(
      'rejects %s before touching any port',
      async (_label, clientId, receptionId, validatedBy) => {
        await expect(
          useCase.execute(clientId, receptionId, validatedBy, agreedItems),
        ).rejects.toBeInstanceOf(InvalidInputError);

        expect(repository.findByIdForClient).not.toHaveBeenCalled();
        expect(validation.validateWithStock).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['a zero validated quantity', 0],
      ['a negative validated quantity', -1],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['a numeric string', '8'],
      ['a missing validated quantity', undefined],
    ])(
      'rejects %s before touching any port',
      async (_label, validatedQuantity) => {
        await expect(
          useCase.execute('client-1', 'reception-1', 'user-1', [
            { inputId: 'input-1', validatedQuantity },
          ] as unknown as ReceptionItemValidation[]),
        ).rejects.toBeInstanceOf(InvalidInputError);

        expect(repository.findByIdForClient).not.toHaveBeenCalled();
        expect(validation.validateWithStock).not.toHaveBeenCalled();
      },
    );

    it('rejects a missing or empty validated item list before touching any port', async () => {
      await expect(
        useCase.execute(
          'client-1',
          'reception-1',
          'user-1',
          undefined as unknown as ReceptionItemValidation[],
        ),
      ).rejects.toBeInstanceOf(InvalidInputError);

      await expect(
        useCase.execute('client-1', 'reception-1', 'user-1', []),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(repository.findByIdForClient).not.toHaveBeenCalled();
      expect(validation.validateWithStock).not.toHaveBeenCalled();
    });

    it('rejects a decision that leaves a declared input unvalidated without deciding the reception', async () => {
      await expect(
        useCase.execute('client-1', 'reception-1', 'user-1', [
          { inputId: 'input-1', validatedQuantity: 8 },
        ]),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(repository.findByIdForClient).toHaveBeenCalledWith(
        'reception-1',
        'client-1',
      );
      expect(validation.validateWithStock).not.toHaveBeenCalled();
    });

    it('rejects a decision over an input that is not part of the reception', async () => {
      await expect(
        useCase.execute('client-1', 'reception-1', 'user-1', [
          ...agreedItems,
          { inputId: 'input-9', validatedQuantity: 3 },
        ]),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(validation.validateWithStock).not.toHaveBeenCalled();
    });

    it('rejects a decision that validates the same input twice', async () => {
      await expect(
        useCase.execute('client-1', 'reception-1', 'user-1', [
          { inputId: 'input-1', validatedQuantity: 8 },
          { inputId: 'input-1', validatedQuantity: 9 },
          { inputId: 'input-2', validatedQuantity: 4 },
        ]),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(validation.validateWithStock).not.toHaveBeenCalled();
    });

    it('rejects a reception that is not visible for the client scope', async () => {
      repository.findByIdForClient.mockResolvedValue(null);

      await expect(
        useCase.execute('client-2', 'reception-1', 'user-1', agreedItems),
      ).rejects.toBeInstanceOf(EntityNotFoundError);

      expect(repository.findByIdForClient).toHaveBeenCalledWith(
        'reception-1',
        'client-2',
      );
      expect(validation.validateWithStock).not.toHaveBeenCalled();
    });

    it.each(['VALIDADA', 'RECHAZADA'] as const)(
      'rejects a reception already %s',
      async (status) => {
        repository.findByIdForClient.mockResolvedValue({
          ...baseReception,
          status,
        });

        await expect(
          useCase.execute('client-1', 'reception-1', 'user-1', agreedItems),
        ).rejects.toBeInstanceOf(InvalidStateTransitionError);

        expect(validation.validateWithStock).not.toHaveBeenCalled();
      },
    );

    it('validates a pending reception with the agreed quantities, the client scope and the current time', async () => {
      const validated: ReceptionRecord = {
        ...baseReception,
        status: 'VALIDADA',
        validatedBy: 'user-1',
        validatedAt: validationDate,
        items: [
          {
            ...baseReception.items[0],
            validatedQuantity: 8,
            quantityVariance: -2,
          },
          {
            ...baseReception.items[1],
            validatedQuantity: 4,
            quantityVariance: 0,
          },
        ],
      };
      const expected: ValidateReceptionData = {
        id: 'reception-1',
        clientId: 'client-1',
        validatedBy: 'user-1',
        validatedAt: validationDate,
        items: agreedItems,
      };
      validation.validateWithStock.mockResolvedValue(validated);

      await expect(
        useCase.execute('client-1', 'reception-1', 'user-1', agreedItems),
      ).resolves.toEqual(validated);

      expect(validation.validateWithStock).toHaveBeenCalledWith(expected);
      expect(clock.now).toHaveBeenCalled();
    });
  });

  describe('RejectReceptionUseCase', () => {
    let repository: jest.Mocked<ReceptionRepositoryPort>;
    let validation: jest.Mocked<ReceptionValidationPort>;
    let useCase: RejectReceptionUseCase;

    beforeEach(() => {
      repository = createRepository();
      validation = createValidation();
      useCase = new RejectReceptionUseCase(repository, validation);
      repository.findByIdForClient.mockResolvedValue(baseReception);
    });

    it.each([
      ['an empty client id', '  ', 'reception-1', 'motivo'],
      ['an empty reception id', 'client-1', '  ', 'motivo'],
      ['an empty reason', 'client-1', 'reception-1', '   '],
    ])(
      'rejects %s before touching any port',
      async (_label, clientId, receptionId, reason) => {
        await expect(
          useCase.execute(clientId, receptionId, reason),
        ).rejects.toBeInstanceOf(InvalidInputError);

        expect(repository.findByIdForClient).not.toHaveBeenCalled();
        expect(validation.reject).not.toHaveBeenCalled();
      },
    );

    it('rejects a reception that is not visible for the client scope', async () => {
      repository.findByIdForClient.mockResolvedValue(null);

      await expect(
        useCase.execute('client-1', 'reception-1', 'motivo'),
      ).rejects.toBeInstanceOf(EntityNotFoundError);

      expect(validation.reject).not.toHaveBeenCalled();
    });

    it('rejects a reception that was already decided', async () => {
      repository.findByIdForClient.mockResolvedValue({
        ...baseReception,
        status: 'RECHAZADA',
      });

      await expect(
        useCase.execute('client-1', 'reception-1', 'motivo'),
      ).rejects.toBeInstanceOf(InvalidStateTransitionError);

      expect(validation.reject).not.toHaveBeenCalled();
    });

    it('rejects a pending reception with the trimmed reason and no stock movement', async () => {
      const rejected: ReceptionRecord = {
        ...baseReception,
        status: 'RECHAZADA',
        rejectionReason: 'cantidad distinta',
      };
      validation.reject.mockResolvedValue(rejected);

      await expect(
        useCase.execute('client-1', 'reception-1', '  cantidad distinta  '),
      ).resolves.toEqual(rejected);

      expect(validation.reject).toHaveBeenCalledWith({
        id: 'reception-1',
        clientId: 'client-1',
        rejectionReason: 'cantidad distinta',
      });
    });
  });

  describe('FindReceptionUseCase', () => {
    it('returns the reception of the client scope', async () => {
      const repository = createRepository();
      const useCase = new FindReceptionUseCase(repository);
      repository.findByIdForClient.mockResolvedValue(baseReception);

      await expect(
        useCase.execute('client-1', 'reception-1'),
      ).resolves.toEqual(baseReception);

      expect(repository.findByIdForClient).toHaveBeenCalledWith(
        'reception-1',
        'client-1',
      );
    });

    it('throws when the reception does not exist inside the client scope', async () => {
      const repository = createRepository();
      const useCase = new FindReceptionUseCase(repository);
      repository.findByIdForClient.mockResolvedValue(null);

      await expect(
        useCase.execute('client-1', 'reception-9'),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects blank identifiers', async () => {
      const repository = createRepository();
      const useCase = new FindReceptionUseCase(repository);

      await expect(
        useCase.execute('  ', 'reception-1'),
      ).rejects.toBeInstanceOf(InvalidInputError);
      await expect(
        useCase.execute('client-1', '  '),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(repository.findByIdForClient).not.toHaveBeenCalled();
    });
  });

  describe('FindReceptionsByClientUseCase', () => {
    it('lists the receptions of the client', async () => {
      const repository = createRepository();
      const useCase = new FindReceptionsByClientUseCase(repository);
      repository.findAllByClient.mockResolvedValue([baseReception]);

      await expect(useCase.execute('client-1')).resolves.toEqual([
        baseReception,
      ]);

      expect(repository.findAllByClient).toHaveBeenCalledWith('client-1');
    });

    it('rejects a blank client id', async () => {
      const repository = createRepository();
      const useCase = new FindReceptionsByClientUseCase(repository);

      await expect(useCase.execute('  ')).rejects.toBeInstanceOf(
        InvalidInputError,
      );

      expect(repository.findAllByClient).not.toHaveBeenCalled();
    });
  });
});
