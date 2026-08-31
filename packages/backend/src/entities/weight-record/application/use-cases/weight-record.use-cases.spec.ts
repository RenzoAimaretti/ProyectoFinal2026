import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
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
    findAllByCompanyId: jest.fn(),
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateForCompany: jest.fn(),
    delete: jest.fn(),
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
    it('returns only weight records for the provided company', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([baseWeightRecord]);

      const useCase = new FindAllWeightRecordsUseCase(repository);

      await expect(useCase.execute('company-1')).resolves.toEqual([baseWeightRecord]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list for a different company scope', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([]);

      const useCase = new FindAllWeightRecordsUseCase(repository);

      await expect(useCase.execute('company-2')).resolves.toEqual([]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-2');
    });
  });

  describe('FindWeightRecordUseCase', () => {
    it('returns a weight record by id within the current company', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(baseWeightRecord);

      const useCase = new FindWeightRecordUseCase(repository);

      await expect(useCase.execute('weight-1', 'company-1')).resolves.toEqual(
        baseWeightRecord,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('weight-1', 'company-1');
    });

    it('rejects a cross-tenant weight record target', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(null);

      const useCase = new FindWeightRecordUseCase(repository);

      await expect(useCase.execute('weight-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('weight-1', 'company-2');
    });
  });

  describe('CreateWeightRecordUseCase', () => {
    let repository: jest.Mocked<WeightRecordRepositoryPort>;
    let livestockReader: jest.Mocked<LivestockReaderPort>;
    let userReader: jest.Mocked<UserReaderPort>;
    let useCase: CreateWeightRecordUseCase;

    beforeEach(() => {
      ({ repository, livestockReader, userReader } = createPorts());
      useCase = new CreateWeightRecordUseCase(repository, livestockReader, userReader);
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

      await expect(useCase.execute('company-1', input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('creates a weight record inside the current company scope', async () => {
      livestockReader.findByIdForCompany.mockResolvedValue({ id: 'livestock-1' });
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-1' });
      repository.create.mockResolvedValue(baseWeightRecord);

      await expect(
        useCase.execute('company-1', {
          livestockId: 'livestock-1',
          operatorId: 'user-1',
          weight: 412.5,
          measuredAt: '2026-01-12',
        }),
      ).resolves.toEqual(baseWeightRecord);

      expect(livestockReader.findByIdForCompany).toHaveBeenCalledWith(
        'livestock-1',
        'company-1',
      );
      expect(userReader.findByIdForCompany).toHaveBeenCalledWith('user-1', 'company-1');
      expect(repository.create).toHaveBeenCalledWith({
        livestockId: 'livestock-1',
        operatorId: 'user-1',
        weight: 412.5,
        measuredAt: new Date('2026-01-12'),
      });
    });

    it('rejects a livestock that belongs to another company', async () => {
      livestockReader.findByIdForCompany.mockResolvedValue(null);
      livestockReader.findById.mockResolvedValue({ id: 'livestock-1' });

      await expect(
        useCase.execute('company-1', {
          livestockId: 'livestock-1',
          operatorId: 'user-1',
          weight: 412.5,
          measuredAt: '2026-01-12',
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('UpdateWeightRecordUseCase', () => {
    let repository: jest.Mocked<WeightRecordRepositoryPort>;
    let livestockReader: jest.Mocked<LivestockReaderPort>;
    let userReader: jest.Mocked<UserReaderPort>;
    let useCase: UpdateWeightRecordUseCase;

    beforeEach(() => {
      ({ repository, livestockReader, userReader } = createPorts());
      useCase = new UpdateWeightRecordUseCase(repository, userReader);
      void livestockReader;
    });

    it.each([undefined, {}])('rejects empty payload %p', async (input) => {
      await expect(
        useCase.execute('weight-1', 'company-1', input as UpdateWeightRecordInput),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects a missing record in the current company', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(
        useCase.execute('weight-1', 'company-1', { weight: 420 }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('updates a weight record inside the current company scope', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseWeightRecord);
      userReader.findByIdForCompany.mockResolvedValue({ id: 'user-2' });
      repository.updateForCompany.mockResolvedValue({
        ...baseWeightRecord,
        operatorId: 'user-2',
        weight: 420,
        measuredAt: new Date('2026-02-01T00:00:00.000Z'),
      });

      const result = await useCase.execute('weight-1', 'company-1', {
        operatorId: 'user-2',
        weight: 420,
        measuredAt: '2026-02-01',
      });

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('weight-1', 'company-1');
      expect(repository.updateForCompany).toHaveBeenCalledWith('weight-1', 'company-1', {
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

    it('rejects a foreign operator reference during update', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseWeightRecord);
      userReader.findByIdForCompany.mockResolvedValue(null);
      userReader.findById.mockResolvedValue({ id: 'user-2' });

      await expect(
        useCase.execute('weight-1', 'company-1', { operatorId: 'user-2' }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(repository.updateForCompany).not.toHaveBeenCalled();
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
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(useCase.execute('weight-1', 'company-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.deleteForCompany).not.toHaveBeenCalled();
    });

    it('deletes a weight record inside the current company scope', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseWeightRecord);

      await expect(useCase.execute('weight-1', 'company-1')).resolves.toEqual({
        message: 'Weight record with id weight-1 deleted successfully',
      });
      expect(repository.deleteForCompany).toHaveBeenCalledWith('weight-1', 'company-1');
    });
  });
});
