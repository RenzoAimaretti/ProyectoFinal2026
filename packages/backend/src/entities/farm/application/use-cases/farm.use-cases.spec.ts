import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { CompanyReaderPort, FarmRepositoryPort } from '../farm.ports';
import { CreateFarmInput, UpdateFarmInput } from '../farm.types';
import { CreateFarmUseCase } from './create-farm.use-case';
import { FindAllFarmsUseCase } from './find-all-farms.use-case';
import { FindFarmUseCase } from './find-farm.use-case';
import { UpdateFarmUseCase } from './update-farm.use-case';

const baseFarm = {
  id: 'farm-1',
  companyId: 'company-1',
  name: 'North Field',
  location: 'North road',
  surface: 120.5,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

function createPorts() {
  const repository: jest.Mocked<FarmRepositoryPort> = {
    findAllByCompanyId: jest.fn(),
    findByIdForCompany: jest.fn(),
    findByNameAndCompanyId: jest.fn(),
    create: jest.fn(),
    updateForCompany: jest.fn(),
  };

  const companyReader: jest.Mocked<CompanyReaderPort> = {
    findById: jest.fn(),
  };

  return { repository, companyReader };
}

describe('Farm use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/farm');
    const files = [
      'domain/errors.ts',
      'application/farm.ports.ts',
      'application/farm.types.ts',
      'application/farm.validation.ts',
      'application/use-cases/create-farm.use-case.ts',
      'application/use-cases/find-all-farms.use-case.ts',
      'application/use-cases/find-farm.use-case.ts',
      'application/use-cases/update-farm.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllFarmsUseCase', () => {
    it('returns only farms for the provided company', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([baseFarm]);

      const useCase = new FindAllFarmsUseCase(repository);

      await expect(useCase.execute('company-1')).resolves.toEqual([baseFarm]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list when there are no farms', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([]);

      const useCase = new FindAllFarmsUseCase(repository);

      await expect(useCase.execute('company-2')).resolves.toEqual([]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-2');
    });
  });

  describe('FindFarmUseCase', () => {
    it('returns a farm by id within the current company', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(baseFarm);

      const useCase = new FindFarmUseCase(repository);

      await expect(useCase.execute('farm-1', 'company-1')).resolves.toEqual(
        baseFarm,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith(
        'farm-1',
        'company-1',
      );
    });

    it('rejects missing farm outside the current company', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(null);

      const useCase = new FindFarmUseCase(repository);

      await expect(useCase.execute('farm-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith(
        'farm-1',
        'company-2',
      );
    });
  });

  describe('CreateFarmUseCase', () => {
    let repository: jest.Mocked<FarmRepositoryPort>;
    let companyReader: jest.Mocked<CompanyReaderPort>;
    let useCase: CreateFarmUseCase;

    beforeEach(() => {
      ({ repository, companyReader } = createPorts());
      useCase = new CreateFarmUseCase(repository, companyReader);
    });

    it.each([
      ['name', undefined],
      ['location', ''],
      ['surface', 0],
    ])('rejects invalid required %s', async (field, value) => {
      const input: CreateFarmInput = {
        name: 'North Field',
        location: 'North road',
        surface: 120.5,
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute('company-1', input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects missing company', async () => {
      companyReader.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('company-1', {
          name: 'North Field',
          location: 'North road',
          surface: 120.5,
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects duplicate farm name within the same company', async () => {
      companyReader.findById.mockResolvedValue({ id: 'company-1' });
      repository.findByNameAndCompanyId.mockResolvedValue(baseFarm);

      await expect(
        useCase.execute('company-1', {
          name: 'North Field',
          location: 'North road',
          surface: 120.5,
        }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
    });

    it('creates farm', async () => {
      companyReader.findById.mockResolvedValue({ id: 'company-1' });
      repository.findByNameAndCompanyId.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseFarm);

      await expect(
        useCase.execute('company-1', {
          name: 'North Field',
          location: 'North road',
          surface: 120.5,
        }),
      ).resolves.toEqual(baseFarm);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'North Field',
        location: 'North road',
        companyId: 'company-1',
        surface: 120.5,
      });
    });
  });

  describe('UpdateFarmUseCase', () => {
    let repository: jest.Mocked<FarmRepositoryPort>;
    let companyReader: jest.Mocked<CompanyReaderPort>;
    let useCase: UpdateFarmUseCase;

    beforeEach(() => {
      ({ repository, companyReader } = createPorts());
      useCase = new UpdateFarmUseCase(repository, companyReader);
    });

    it.each([undefined, {}, { name: '   ' }, { surface: 0 }])(
      'rejects invalid update payload %p',
      async (input) => {
        if (input && typeof input === 'object' && !Array.isArray(input)) {
          repository.findByIdForCompany.mockResolvedValue(baseFarm);
        }

        await expect(
          useCase.execute('farm-1', 'company-1', input as UpdateFarmInput),
        ).rejects.toBeInstanceOf(InvalidInputError);
      },
    );

    it('rejects missing farm', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(
        useCase.execute('farm-1', 'company-1', {
          name: 'New name',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('ignores deprecated body companyId when only that field is present', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseFarm);

      await expect(
        useCase.execute('farm-1', 'company-1', {
          companyId: 'company-2' as never,
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(repository.findByIdForCompany).not.toHaveBeenCalled();
      expect(companyReader.findById).not.toHaveBeenCalled();
    });

    it('updates farm', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseFarm);
      repository.updateForCompany.mockResolvedValue({
        ...baseFarm,
        name: 'South Field',
      });

      await expect(
        useCase.execute('farm-1', 'company-1', {
          name: 'South Field',
          companyId: 'company-1' as never,
        }),
      ).resolves.toEqual({ ...baseFarm, name: 'South Field' });

      expect(repository.findByIdForCompany).toHaveBeenCalledWith(
        'farm-1',
        'company-1',
      );
      expect(companyReader.findById).not.toHaveBeenCalled();
      expect(repository.updateForCompany).toHaveBeenCalledWith(
        'farm-1',
        'company-1',
        {
        name: 'South Field',
        },
      );
    });
  });
});
