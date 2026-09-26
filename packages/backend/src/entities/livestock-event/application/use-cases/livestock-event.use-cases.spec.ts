import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import {
  CreateLivestockEventInput,
  LivestockEventRecord,
  LivestockEventType,
  UpdateLivestockEventInput,
} from '../livestock-event.types';
import {
  LivestockEventRepositoryPort,
  LivestockReaderPort,
  UserReaderPort,
} from '../livestock-event.ports';
import { CreateLivestockEventUseCase } from './create-livestock-event.use-case';
import { FindAllLivestockEventsUseCase } from './find-all-livestock-events.use-case';
import { FindLivestockEventUseCase } from './find-livestock-event.use-case';
import { UpdateLivestockEventUseCase } from './update-livestock-event.use-case';

const baseEvent = {
  id: 'event-1',
  livestockId: 'livestock-1',
  operatorId: 'user-1',
  type: 'VACUNACION' as LivestockEventType,
  observations: 'Annual vaccine',
  vaccine: 'Aftosa',
  dose: 2,
  eventDate: new Date('2026-01-10T00:00:00.000Z'),
  createdAt: new Date('2026-01-11T00:00:00.000Z'),
};

function createPorts() {
  const repository: jest.Mocked<LivestockEventRepositoryPort> = {
    findAll: jest.fn(),
    findAllByCompanyId: jest.fn(),
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateForCompany: jest.fn(),
    deleteForCompany: jest.fn(),
  };

  const livestockReader: jest.Mocked<LivestockReaderPort> = {
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
  };

  const userReader: jest.Mocked<UserReaderPort> = {
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
  };

  return { repository, livestockReader, userReader };
}

describe('Livestock event use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/livestock-event');
    const files = [
      'domain/errors.ts',
      'application/livestock-event.ports.ts',
      'application/livestock-event.types.ts',
      'application/livestock-event.validation.ts',
      'application/use-cases/create-livestock-event.use-case.ts',
      'application/use-cases/find-all-livestock-events.use-case.ts',
      'application/use-cases/find-livestock-event.use-case.ts',
      'application/use-cases/update-livestock-event.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllLivestockEventsUseCase', () => {
    it('returns only livestock events for the provided company', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([baseEvent]);

      const useCase = new FindAllLivestockEventsUseCase(repository);

      await expect(useCase.execute('company-1')).resolves.toEqual([baseEvent]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list for a different company scope', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([]);

      const useCase = new FindAllLivestockEventsUseCase(repository);

      await expect(useCase.execute('company-2')).resolves.toEqual([]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-2');
    });
  });

  describe('FindLivestockEventUseCase', () => {
    it('returns a livestock event by id within the current company', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(baseEvent);

      const useCase = new FindLivestockEventUseCase(repository);

      await expect(useCase.execute('event-1', 'company-1')).resolves.toEqual(baseEvent);

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('event-1', 'company-1');
    });

    it('rejects a cross-tenant livestock event target', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(null);

      const useCase = new FindLivestockEventUseCase(repository);

      await expect(useCase.execute('event-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('event-1', 'company-2');
    });
  });

  describe('CreateLivestockEventUseCase', () => {
    let repository: jest.Mocked<LivestockEventRepositoryPort>;
    let livestockReader: jest.Mocked<LivestockReaderPort>;
    let userReader: jest.Mocked<UserReaderPort>;
    let useCase: CreateLivestockEventUseCase;

    beforeEach(() => {
      ({ repository, livestockReader, userReader } = createPorts());
      useCase = new CreateLivestockEventUseCase(
        repository,
        livestockReader,
        userReader,
      );
    });

    it.each([
      ['eventDate', undefined],
      ['eventType', undefined],
      ['livestockId', undefined],
      ['operatorId', undefined],
    ])('rejects missing required %s', async (field, value) => {
      const input: CreateLivestockEventInput = {
        eventDate: '2026-01-10',
        eventType: 'VACUNACION',
        livestockId: 'livestock-1',
        operatorId: 'user-1',
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute('company-1', input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('creates an event inside the current company scope', async () => {
      livestockReader.findByIdForCompany.mockResolvedValue({ id: 'livestock-1' });
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1' });
      repository.create.mockResolvedValue(baseEvent);

      await expect(
        useCase.execute('company-1', {
          eventDate: '2026-01-10',
          eventType: 'VACUNACION',
          livestockId: 'livestock-1',
          operatorId: 'user-1',
          obs: 'Annual vaccine',
          vaccine: 'Aftosa',
          dose: 2,
        }),
      ).resolves.toEqual(baseEvent);

      expect(livestockReader.findByIdForCompany).toHaveBeenCalledWith(
        'livestock-1',
        'company-1',
      );
      expect(userReader.findByIdForCompany).toHaveBeenCalledWith('user-1', 'company-1');
      expect(repository.create).toHaveBeenCalledWith({
        eventDate: new Date('2026-01-10'),
        eventType: 'VACUNACION',
        livestockId: 'livestock-1',
        operatorId: 'user-1',
        obs: 'Annual vaccine',
        vaccine: 'Aftosa',
        dose: 2,
      });
    });

    it('rejects a livestock that belongs to another company', async () => {
      livestockReader.findByIdForCompany.mockResolvedValue(null);
      livestockReader.findById.mockResolvedValue({ id: 'livestock-1' });

      await expect(
        useCase.execute('company-1', {
          eventDate: '2026-01-10',
          eventType: 'VACUNACION',
          livestockId: 'livestock-1',
          operatorId: 'user-1',
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(livestockReader.findByIdForCompany).toHaveBeenCalledWith(
        'livestock-1',
        'company-1',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an operator that belongs to another company', async () => {
      livestockReader.findByIdForCompany.mockResolvedValue({ id: 'livestock-1' });
      userReader.findByIdForCompany.mockResolvedValue(null);
      userReader.findById.mockResolvedValue({ id: 'user-1' });

      await expect(
        useCase.execute('company-1', {
          eventDate: '2026-01-10',
          eventType: 'VACUNACION',
          livestockId: 'livestock-1',
          operatorId: 'user-1',
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(userReader.findByIdForCompany).toHaveBeenCalledWith('user-1', 'company-1');
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('UpdateLivestockEventUseCase', () => {
    let repository: jest.Mocked<LivestockEventRepositoryPort>;
    let livestockReader: jest.Mocked<LivestockReaderPort>;
    let userReader: jest.Mocked<UserReaderPort>;
    let useCase: UpdateLivestockEventUseCase;

    beforeEach(() => {
      ({ repository, livestockReader, userReader } = createPorts());
      useCase = new UpdateLivestockEventUseCase(
        repository,
        livestockReader,
        userReader,
      );
    });

    it.each([undefined, {}, { eventDate: undefined }])(
      'rejects empty update payload %p',
      async (input) => {
        await expect(
          useCase.execute('event-1', 'company-1', input as UpdateLivestockEventInput),
        ).rejects.toBeInstanceOf(InvalidInputError);
      },
    );

    it('rejects missing livestock event inside the current company', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(
        useCase.execute('event-1', 'company-1', { obs: 'New observation' }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects invalid update date', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseEvent);

      await expect(
        useCase.execute('event-1', 'company-1', { eventDate: 'not-a-date' }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('updates an event inside the current company scope', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseEvent);
      livestockReader.findByIdForCompany.mockResolvedValue({ id: 'livestock-1' });
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1' });
      repository.updateForCompany.mockResolvedValue({
        ...baseEvent,
        type: 'TRATAMIENTO',
        vaccine: null,
        dose: null,
      });

      const result = await useCase.execute('event-1', 'company-1', {
        eventType: 'TRATAMIENTO',
        vaccine: 'ignored',
        dose: 4,
        obs: 'Adjusted treatment',
      });

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('event-1', 'company-1');
      expect(repository.updateForCompany).toHaveBeenCalledWith('event-1', 'company-1', {
        eventType: 'TRATAMIENTO',
        vaccine: null,
        dose: null,
        obs: 'Adjusted treatment',
      });
      expect(result).toEqual({
        ...baseEvent,
        type: 'TRATAMIENTO',
        vaccine: null,
        dose: null,
      });
    });

    it('rejects a foreign livestock reference during update', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseEvent);
      livestockReader.findByIdForCompany.mockResolvedValue(null);
      livestockReader.findById.mockResolvedValue({ id: 'livestock-1' });

      await expect(
        useCase.execute('event-1', 'company-1', { livestockId: 'livestock-1' }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(repository.updateForCompany).not.toHaveBeenCalled();
    });

    it('updates a vaccination event and normalizes the date', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseEvent);
      livestockReader.findByIdForCompany.mockResolvedValue({ id: 'livestock-1' });
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1' });
      repository.updateForCompany.mockResolvedValue({
        ...baseEvent,
        eventDate: new Date('2026-02-01T00:00:00.000Z'),
      });

      await useCase.execute('event-1', 'company-1', {
        eventDate: '2026-02-01',
        eventType: 'VACUNACION',
        vaccine: 'Fiebre aftosa',
        dose: 3,
      });

      expect(repository.updateForCompany).toHaveBeenCalledWith('event-1', 'company-1', {
        eventDate: new Date('2026-02-01'),
        eventType: 'VACUNACION',
        vaccine: 'Fiebre aftosa',
        dose: 3,
      });
    });
  });
});
