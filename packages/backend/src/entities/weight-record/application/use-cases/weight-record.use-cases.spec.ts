import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import {
  CreateWeightRecordInput,
  UpdateWeightRecordInput,
  WeightRecordRecord,
} from '../weight-record.types';
import {
  LivestockReaderPort,
  UserReaderPort,
  WeightRecordRepositoryPort,
} from '../weight-record.ports';
import { CreateWeightRecordUseCase } from './create-weight-record.use-case';
import { DeleteWeightRecordUseCase } from './delete-weight-record.use-case';
import { FindAllWeightRecordsUseCase } from './find-all-weight-records.use-case';
import { FindWeightRecordUseCase } from './find-weight-record.use-case';
import { UpdateWeightRecordUseCase } from './update-weight-record.use-case';

const baseWeightRecord = {
  id: 'weight-1',
  livestockId: 'livestock-1',
  operatorId: 'user-1',
  weight: 412.5,
  measuredAt: new Date('2026-01-12T00:00:00.000Z'),
  createdAt: new Date('2026-01-13T00:00:00.000Z'),
};

function createPorts() {
  const repository: jest.Mocked<WeightRecordRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const livestockReader: jest.Mocked<LivestockReaderPort> = {
    findById: jest.fn(),
  };

  const userReader: jest.Mocked<UserReaderPort> = {
    findById: jest.fn(),
  };

  return { repository, livestockReader, userReader };
}

describe('Weight record use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/weight-record');
    const files = [
      'domain/errors.ts',
      'application/weight-record.ports.ts',
      'application/weight-record.types.ts',
      'application/weight-record.validation.ts',
      'application/use-cases/create-weight-record.use-case.ts',
      'application/use-cases/delete-weight-record.use-case.ts',
      'application/use-cases/find-all-weight-records.use-case.ts',
      'application/use-cases/find-weight-record.use-case.ts',
      'application/use-cases/update-weight-record.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllWeightRecordsUseCase', () => {
    it('returns all weight records', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([baseWeightRecord]);

      const useCase = new FindAllWeightRecordsUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([baseWeightRecord]);
    });

    it('returns an empty list when there are no weight records', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([]);

      const useCase = new FindAllWeightRecordsUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([]);
    });
  });

  describe('FindWeightRecordUseCase', () => {
    it('returns a weight record by id', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(baseWeightRecord);

      const useCase = new FindWeightRecordUseCase(repository);

      await expect(useCase.execute('weight-1')).resolves.toEqual(
        baseWeightRecord,
      );
    });

    it('returns null when the weight record is missing', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(null);

      const useCase = new FindWeightRecordUseCase(repository);

      await expect(useCase.execute('weight-1')).resolves.toBeNull();
    });
  });

  describe('CreateWeightRecordUseCase', () => {
    let repository: jest.Mocked<WeightRecordRepositoryPort>;
    let livestockReader: jest.Mocked<LivestockReaderPort>;
    let userReader: jest.Mocked<UserReaderPort>;
    let useCase: CreateWeightRecordUseCase;

    beforeEach(() => {
      ({ repository, livestockReader, userReader } = createPorts());
      useCase = new CreateWeightRecordUseCase(
        repository,
        livestockReader,
        userReader,
      );
    });

    it.each([
      ['livestockId', undefined],
      ['operatorId', undefined],
      ['measuredAt', undefined],
    ])('rejects missing required %s', async (field, value) => {
      const input: CreateWeightRecordInput = {
        livestockId: 'livestock-1',
        operatorId: 'user-1',
        weight: 412.5,
        measuredAt: '2026-01-12',
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects invalid measuredAt', async () => {
      await expect(
        useCase.execute({
          livestockId: 'livestock-1',
          operatorId: 'user-1',
          weight: 412.5,
          measuredAt: 'not-a-date',
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects missing livestock or operator', async () => {
      livestockReader.findById.mockResolvedValue(null);
      userReader.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          livestockId: 'livestock-1',
          operatorId: 'user-1',
          weight: 412.5,
          measuredAt: '2026-01-12',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('creates a weight record', async () => {
      livestockReader.findById.mockResolvedValue({ id: 'livestock-1' });
      userReader.findById.mockResolvedValue({ id: 'user-1' });
      repository.create.mockResolvedValue(baseWeightRecord);

      await expect(
        useCase.execute({
          livestockId: 'livestock-1',
          operatorId: 'user-1',
          weight: 412.5,
          measuredAt: '2026-01-12',
        }),
      ).resolves.toEqual(baseWeightRecord);

      expect(repository.create).toHaveBeenCalledWith({
        livestockId: 'livestock-1',
        operatorId: 'user-1',
        weight: 412.5,
        measuredAt: new Date('2026-01-12'),
      });
    });
  });

  describe('UpdateWeightRecordUseCase', () => {
    let repository: jest.Mocked<WeightRecordRepositoryPort>;
    let livestockReader: jest.Mocked<LivestockReaderPort>;
    let userReader: jest.Mocked<UserReaderPort>;
    let useCase: UpdateWeightRecordUseCase;

    beforeEach(() => {
      ({ repository, livestockReader, userReader } = createPorts());
      useCase = new UpdateWeightRecordUseCase(
        repository,
        userReader,
      );
    });

    it.each([undefined, {}])('rejects empty update payload %p', async (input) => {
      await expect(
        useCase.execute('weight-1', input as UpdateWeightRecordInput),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects missing weight record', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('weight-1', { weight: 420 }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects invalid update date', async () => {
      repository.findById.mockResolvedValue(baseWeightRecord);

      await expect(
        useCase.execute('weight-1', { measuredAt: 'not-a-date' }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('updates a weight record', async () => {
      repository.findById.mockResolvedValue(baseWeightRecord);
      userReader.findById.mockResolvedValue({ id: 'user-2' });
      repository.update.mockResolvedValue({
        ...baseWeightRecord,
        operatorId: 'user-2',
        weight: 420,
        measuredAt: new Date('2026-02-01T00:00:00.000Z'),
      });

      const result = await useCase.execute('weight-1', {
        operatorId: 'user-2',
        weight: 420,
        measuredAt: '2026-02-01',
      });

      expect(repository.update).toHaveBeenCalledWith('weight-1', {
        operatorId: 'user-2',
        weight: 420,
        measuredAt: new Date('2026-02-01'),
      });
      expect(result).toEqual({
        ...baseWeightRecord,
        operatorId: 'user-2',
        weight: 420,
        measuredAt: new Date('2026-02-01T00:00:00.000Z'),
      });
    });
  });

  describe('DeleteWeightRecordUseCase', () => {
    let repository: jest.Mocked<WeightRecordRepositoryPort>;
    let useCase: DeleteWeightRecordUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new DeleteWeightRecordUseCase(repository);
    });

    it('rejects a missing weight record', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(useCase.execute('weight-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes a weight record and returns legacy message', async () => {
      repository.findById.mockResolvedValue(baseWeightRecord);

      await expect(useCase.execute('weight-1')).resolves.toEqual({
        message: 'Weight record with id weight-1 deleted successfully',
      });
      expect(repository.delete).toHaveBeenCalledWith('weight-1');
    });
  });
});
