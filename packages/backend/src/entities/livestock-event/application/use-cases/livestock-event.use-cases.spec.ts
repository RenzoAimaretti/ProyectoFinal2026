import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EntityNotFoundError,
  InvalidInputError,
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
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const livestockReader: jest.Mocked<LivestockReaderPort> = {
    findById: jest.fn(),
  };

  const userReader: jest.Mocked<UserReaderPort> = {
    findById: jest.fn(),
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
    it('returns all livestock events', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([baseEvent]);

      const useCase = new FindAllLivestockEventsUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([baseEvent]);
    });

    it('returns an empty list when there are no livestock events', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([]);

      const useCase = new FindAllLivestockEventsUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([]);
    });
  });

  describe('FindLivestockEventUseCase', () => {
    it('returns a livestock event by id', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(baseEvent);

      const useCase = new FindLivestockEventUseCase(repository);

      await expect(useCase.execute('event-1')).resolves.toEqual(baseEvent);
    });

    it('rejects a missing livestock event', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(null);

      const useCase = new FindLivestockEventUseCase(repository);

      await expect(useCase.execute('event-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
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
        obs: 'Annual vaccine',
        vaccine: 'Aftosa',
        dose: 2,
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects invalid eventDate', async () => {
      await expect(
        useCase.execute({
          eventDate: 'not-a-date',
          eventType: 'VACUNACION',
          livestockId: 'livestock-1',
          operatorId: 'user-1',
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects missing livestock or operator', async () => {
      livestockReader.findById.mockResolvedValue(null);
      userReader.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          eventDate: '2026-01-10',
          eventType: 'VACUNACION',
          livestockId: 'livestock-1',
          operatorId: 'user-1',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('creates an event and strips vaccine data when type is not VACUNACION', async () => {
      livestockReader.findById.mockResolvedValue({ id: 'livestock-1' });
      userReader.findById.mockResolvedValue({ id: 'user-1' });
      repository.create.mockResolvedValue(baseEvent);

      await expect(
        useCase.execute({
          eventDate: '2026-01-10',
          eventType: 'TRATAMIENTO',
          livestockId: 'livestock-1',
          operatorId: 'user-1',
          obs: 'Treatment',
          vaccine: 'Should be ignored',
          dose: 2,
        }),
      ).resolves.toEqual(baseEvent);

      expect(repository.create).toHaveBeenCalledWith({
        eventDate: new Date('2026-01-10'),
        eventType: 'TRATAMIENTO',
        livestockId: 'livestock-1',
        operatorId: 'user-1',
        obs: 'Treatment',
      });
    });

    it('creates a vaccination event with vaccine data preserved', async () => {
      livestockReader.findById.mockResolvedValue({ id: 'livestock-1' });
      userReader.findById.mockResolvedValue({ id: 'user-1' });
      repository.create.mockResolvedValue(baseEvent);

      await useCase.execute({
        eventDate: '2026-01-10',
        eventType: 'VACUNACION',
        livestockId: 'livestock-1',
        operatorId: 'user-1',
        obs: 'Annual vaccine',
        vaccine: 'Aftosa',
        dose: 2,
      });

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
          useCase.execute('event-1', input as UpdateLivestockEventInput),
        ).rejects.toBeInstanceOf(InvalidInputError);
      },
    );

    it('rejects missing livestock event', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('event-1', { obs: 'New observation' }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects invalid update date', async () => {
      repository.findById.mockResolvedValue(baseEvent);

      await expect(
        useCase.execute('event-1', { eventDate: 'not-a-date' }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('updates event and clears vaccine data when type changes', async () => {
      repository.findById.mockResolvedValue(baseEvent);
      livestockReader.findById.mockResolvedValue({ id: 'livestock-1' });
      userReader.findById.mockResolvedValue({ id: 'user-1' });
      repository.update.mockResolvedValue({
        ...baseEvent,
        type: 'TRATAMIENTO',
        vaccine: null,
        dose: null,
      });

      const result = await useCase.execute('event-1', {
        eventType: 'TRATAMIENTO',
        vaccine: 'ignored',
        dose: 4,
        obs: 'Adjusted treatment',
      });

      expect(repository.update).toHaveBeenCalledWith('event-1', {
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

    it('updates a vaccination event and normalizes the date', async () => {
      repository.findById.mockResolvedValue(baseEvent);
      livestockReader.findById.mockResolvedValue({ id: 'livestock-1' });
      userReader.findById.mockResolvedValue({ id: 'user-1' });
      repository.update.mockResolvedValue({
        ...baseEvent,
        eventDate: new Date('2026-02-01T00:00:00.000Z'),
      });

      await useCase.execute('event-1', {
        eventDate: '2026-02-01',
        eventType: 'VACUNACION',
        vaccine: 'Fiebre aftosa',
        dose: 3,
      });

      expect(repository.update).toHaveBeenCalledWith('event-1', {
        eventDate: new Date('2026-02-01'),
        eventType: 'VACUNACION',
        vaccine: 'Fiebre aftosa',
        dose: 3,
      });
    });
  });
});
