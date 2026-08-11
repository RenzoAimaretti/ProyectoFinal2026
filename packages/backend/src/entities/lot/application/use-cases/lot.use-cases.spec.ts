import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { FarmReaderPort, LotRepositoryPort } from '../lot.ports';
import { CreateLotInput, UpdateLotInput } from '../lot.types';
import { CreateLotUseCase } from './create-lot.use-case';
import { FindAllLotsUseCase } from './find-all-lots.use-case';
import { FindLotUseCase } from './find-lot.use-case';
import { UpdateLotUseCase } from './update-lot.use-case';

const baseLot = {
  id: 'lot-1',
  farmId: 'farm-1',
  name: 'North pasture',
  coords: '0,0',
  area: 12.5,
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

function createPorts() {
  const repository: jest.Mocked<LotRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByNameAndFarmId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const farmReader: jest.Mocked<FarmReaderPort> = {
    findById: jest.fn(),
  };

  return { repository, farmReader };
}

describe('Lot use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/lot');
    const files = [
      'domain/errors.ts',
      'application/lot.ports.ts',
      'application/lot.types.ts',
      'application/lot.validation.ts',
      'application/use-cases/create-lot.use-case.ts',
      'application/use-cases/find-all-lots.use-case.ts',
      'application/use-cases/find-lot.use-case.ts',
      'application/use-cases/update-lot.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllLotsUseCase', () => {
    it('returns all lots', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([baseLot]);

      const useCase = new FindAllLotsUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([baseLot]);
    });

    it('returns an empty list when there are no lots', async () => {
      const { repository } = createPorts();
      repository.findAll.mockResolvedValue([]);

      const useCase = new FindAllLotsUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual([]);
    });
  });

  describe('FindLotUseCase', () => {
    it('returns a lot by id', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(baseLot);

      const useCase = new FindLotUseCase(repository);

      await expect(useCase.execute('lot-1')).resolves.toEqual(baseLot);
    });

    it('rejects missing lot', async () => {
      const { repository } = createPorts();
      repository.findById.mockResolvedValue(null);

      const useCase = new FindLotUseCase(repository);

      await expect(useCase.execute('lot-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });
  });

  describe('CreateLotUseCase', () => {
    let repository: jest.Mocked<LotRepositoryPort>;
    let farmReader: jest.Mocked<FarmReaderPort>;
    let useCase: CreateLotUseCase;

    beforeEach(() => {
      ({ repository, farmReader } = createPorts());
      useCase = new CreateLotUseCase(repository, farmReader);
    });

    it.each([
      ['name', undefined],
      ['farmId', ''],
      ['coords', undefined],
      ['area', 0],
    ])('rejects invalid required %s', async (field, value) => {
      const input: CreateLotInput = {
        name: 'North pasture',
        farmId: 'farm-1',
        coords: '0,0',
        area: 12.5,
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects missing farm', async () => {
      farmReader.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          name: 'North pasture',
          farmId: 'farm-1',
          coords: '0,0',
          area: 12.5,
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects duplicate lot name within the same farm', async () => {
      farmReader.findById.mockResolvedValue({ id: 'farm-1' });
      repository.findByNameAndFarmId.mockResolvedValue(baseLot);

      await expect(
        useCase.execute({
          name: 'North pasture',
          farmId: 'farm-1',
          coords: '0,0',
          area: 12.5,
        }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
    });

    it('creates lot', async () => {
      farmReader.findById.mockResolvedValue({ id: 'farm-1' });
      repository.findByNameAndFarmId.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseLot);

      await expect(
        useCase.execute({
          name: 'North pasture',
          farmId: 'farm-1',
          coords: '0,0',
          area: 12.5,
        }),
      ).resolves.toEqual(baseLot);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'North pasture',
        farmId: 'farm-1',
        coords: '0,0',
        area: 12.5,
      });
    });
  });

  describe('UpdateLotUseCase', () => {
    let repository: jest.Mocked<LotRepositoryPort>;
    let farmReader: jest.Mocked<FarmReaderPort>;
    let useCase: UpdateLotUseCase;

    beforeEach(() => {
      ({ repository, farmReader } = createPorts());
      useCase = new UpdateLotUseCase(repository, farmReader);
    });

    it.each([undefined, {}, { area: 0 }])(
      'rejects invalid update payload %p',
      async (input) => {
        if (input && typeof input === 'object' && !Array.isArray(input)) {
          repository.findById.mockResolvedValue(baseLot);
        }

        await expect(
          useCase.execute('lot-1', input as UpdateLotInput),
        ).rejects.toBeInstanceOf(InvalidInputError);
      },
    );

    it('rejects missing lot', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('lot-1', {
          name: 'New pasture',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects missing farm when farmId changes', async () => {
      repository.findById.mockResolvedValue(baseLot);
      farmReader.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('lot-1', {
          farmId: 'farm-2',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('updates lot', async () => {
      repository.findById.mockResolvedValue(baseLot);
      farmReader.findById.mockResolvedValue({ id: 'farm-1' });
      repository.update.mockResolvedValue({
        ...baseLot,
        name: 'South pasture',
      });

      await expect(
        useCase.execute('lot-1', {
          name: 'South pasture',
          farmId: 'farm-1',
        }),
      ).resolves.toEqual({ ...baseLot, name: 'South pasture' });

      expect(repository.update).toHaveBeenCalledWith('lot-1', {
        name: 'South pasture',
        farmId: 'farm-1',
      });
    });
  });
});
