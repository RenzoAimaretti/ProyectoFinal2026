import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import { LivestockStatus } from '../../domain/livestock-status';
import {
  CompanyReaderPort,
  LivestockRepositoryPort,
  LotReaderPort,
} from '../livestock.ports';
import { CreateLivestockInput, UpdateLivestockInput } from '../livestock.types';
import { CreateLivestockUseCase } from './create-livestock.use-case';
import { FindAllLivestockUseCase } from './find-all-livestock.use-case';
import { FindLivestockUseCase } from './find-livestock.use-case';
import { RemoveLivestockUseCase } from './remove-livestock.use-case';
import { UpdateLivestockUseCase } from './update-livestock.use-case';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const baseLivestock = {
  id: 'livestock-1',
  companyId: 'company-1',
  lotId: null,
  tagNumber: 'TAG-001',
  species: 'Bovine',
  breed: null,
  sex: 'M',
  birthDate: null,
  status: 'ACTIVO' as LivestockStatus,
  entryDate: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

function createPorts() {
  const repository: jest.Mocked<LivestockRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByTagNumber: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const companyReader: jest.Mocked<CompanyReaderPort> = {
    findById: jest.fn(),
  };

  const lotReader: jest.Mocked<LotReaderPort> = {
    findById: jest.fn(),
  };

  return { repository, companyReader, lotReader };
}

describe('Livestock use cases', () => {
  it('keeps application use-cases free of NestJS and Prisma imports', () => {
    const basePath = join(
      process.cwd(),
      'src/entities/livestock/application/use-cases',
    );
    const files = [
      'create-livestock.use-case.ts',
      'find-all-livestock.use-case.ts',
      'find-livestock.use-case.ts',
      'remove-livestock.use-case.ts',
      'update-livestock.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('CreateLivestockUseCase', () => {
    let useCase: CreateLivestockUseCase;
    let repository: jest.Mocked<LivestockRepositoryPort>;
    let companyReader: jest.Mocked<CompanyReaderPort>;
    let lotReader: jest.Mocked<LotReaderPort>;

    beforeEach(() => {
      ({ repository, companyReader, lotReader } = createPorts());
      useCase = new CreateLivestockUseCase(
        repository,
        companyReader,
        lotReader,
      );
    });

    it.each([
      ['companyId', undefined],
      ['tagNumber', ''],
      ['species', '   '],
      ['sex', undefined],
    ])('rejects missing required string %s', async (field, value) => {
      const input: CreateLivestockInput = {
        companyId: 'company-1',
        tagNumber: 'TAG-001',
        species: 'Bovine',
        sex: 'M',
        lotId: null,
        breed: null,
        birthDate: null,
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects lot belonging to another company', async () => {
      companyReader.findById.mockResolvedValue({ id: 'company-1' });
      lotReader.findById.mockResolvedValue({
        id: 'lot-1',
        companyId: 'company-2',
      });
      repository.findByTagNumber.mockResolvedValue(null);

      await expect(
        useCase.execute({
          companyId: 'company-1',
          lotId: 'lot-1',
          tagNumber: 'TAG-001',
          species: 'Bovine',
          breed: undefined,
          birthDate: null,
          sex: 'M',
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);
    });

    it('rejects duplicate tagNumber', async () => {
      companyReader.findById.mockResolvedValue({ id: 'company-1' });
      repository.findByTagNumber.mockResolvedValue({ ...baseLivestock });

      await expect(
        useCase.execute({
          companyId: 'company-1',
          tagNumber: 'TAG-001',
          species: 'Bovine',
          sex: 'M',
          breed: null,
          birthDate: null,
        }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
    });

    it('creates livestock and normalizes optional fields/date', async () => {
      companyReader.findById.mockResolvedValue({ id: 'company-1' });
      lotReader.findById.mockResolvedValue({
        id: 'lot-1',
        companyId: 'company-1',
      });
      repository.findByTagNumber.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...baseLivestock,
        id: 'livestock-2',
        lotId: 'lot-1',
        tagNumber: 'TAG-002',
        breed: null,
        birthDate: new Date('2026-02-01T00:00:00.000Z'),
      });

      const result = await useCase.execute({
        companyId: 'company-1',
        lotId: 'lot-1',
        tagNumber: 'TAG-002',
        breed: undefined,
        species: 'Bovine',
        birthDate: '2026-02-01',
        sex: 'M',
      });

      expect(repository.create).toHaveBeenCalledWith({
        companyId: 'company-1',
        lotId: 'lot-1',
        tagNumber: 'TAG-002',
        breed: null,
        species: 'Bovine',
        birthDate: new Date('2026-02-01'),
        sex: 'M',
      });
      expect(result).toEqual({
        ...baseLivestock,
        id: 'livestock-2',
        lotId: 'lot-1',
        tagNumber: 'TAG-002',
        breed: null,
        birthDate: new Date('2026-02-01T00:00:00.000Z'),
      });
    });
  });

  describe('UpdateLivestockUseCase', () => {
    let useCase: UpdateLivestockUseCase;
    let repository: jest.Mocked<LivestockRepositoryPort>;
    let companyReader: jest.Mocked<CompanyReaderPort>;
    let lotReader: jest.Mocked<LotReaderPort>;

    beforeEach(() => {
      ({ repository, companyReader, lotReader } = createPorts());
      useCase = new UpdateLivestockUseCase(
        repository,
        companyReader,
        lotReader,
      );
    });

    it.each([undefined, {}])(
      'rejects empty update payload %p',
      async (input) => {
        await expect(
          useCase.execute('livestock-1', input as UpdateLivestockInput),
        ).rejects.toBeInstanceOf(InvalidInputError);
      },
    );

    it('updates livestock and normalizes date/status', async () => {
      repository.findById.mockResolvedValue({ ...baseLivestock });
      repository.findByTagNumber.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        ...baseLivestock,
        tagNumber: 'TAG-002',
        birthDate: new Date('2026-03-03T00:00:00.000Z'),
        status: 'VENDIDO' as LivestockStatus,
      });

      const result = await useCase.execute('livestock-1', {
        tagNumber: 'TAG-002',
        birthDate: '2026-03-03',
        status: 'VENDIDO' as LivestockStatus,
      });

      expect(repository.update).toHaveBeenCalledWith('livestock-1', {
        tagNumber: 'TAG-002',
        birthDate: new Date('2026-03-03'),
        status: 'VENDIDO',
      });
      expect(result).toEqual({
        ...baseLivestock,
        tagNumber: 'TAG-002',
        birthDate: new Date('2026-03-03T00:00:00.000Z'),
        status: 'VENDIDO',
      });
    });
  });

  describe('RemoveLivestockUseCase', () => {
    let useCase: RemoveLivestockUseCase;
    let repository: jest.Mocked<LivestockRepositoryPort>;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new RemoveLivestockUseCase(repository);
    });

    it('rejects missing livestock', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(useCase.execute('livestock-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('removes livestock and returns legacy message', async () => {
      repository.findById.mockResolvedValue({ ...baseLivestock });

      await expect(useCase.execute('livestock-1')).resolves.toEqual({
        message: 'Livestock with id livestock-1 deleted successfully',
      });
      expect(repository.delete).toHaveBeenCalledWith('livestock-1');
    });
  });

  describe('FindLivestockUseCase', () => {
    let useCase: FindLivestockUseCase;
    let repository: jest.Mocked<LivestockRepositoryPort>;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new FindLivestockUseCase(repository);
    });

    it('returns all livestock', async () => {
      const expected = [{ ...baseLivestock }];
      repository.findAll.mockResolvedValue(expected);
      const findAll = new FindAllLivestockUseCase(repository);

      await expect(findAll.execute()).resolves.toEqual(expected);
    });

    it('rejects missing livestock when fetching one', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(useCase.execute('livestock-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });
  });
});
