import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EntityNotFoundError, InvalidInputError, InvalidRelationError } from '../../domain/errors';
import {
  CreateLivestockMovementInput,
  LivestockMovementRecord,
} from '../livestock-movement.types';
import {
  LivestockMovementRepositoryPort,
  LivestockReaderPort,
  LotReaderPort,
} from '../livestock-movement.ports';
import { CreateLivestockMovementUseCase } from './create-livestock-movement.use-case';
import { FindAllLivestockMovementsUseCase } from './find-all-livestock-movements.use-case';
import { FindLivestockMovementUseCase } from './find-livestock-movement.use-case';

const baseMovement: LivestockMovementRecord = {
  id: 'movement-1',
  livestockId: 'livestock-1',
  lotId: 'lot-1',
  movementDate: new Date('2026-01-12T00:00:00.000Z'),
  observations: 'Moved for grazing',
  createdAt: new Date('2026-01-13T00:00:00.000Z'),
};

function createPorts() {
  const repository: jest.Mocked<LivestockMovementRepositoryPort> = {
    findAllByCompanyId: jest.fn(),
    findByIdForCompany: jest.fn(),
    create: jest.fn(),
  };

  const livestockReader: jest.Mocked<LivestockReaderPort> = {
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
  };

  const lotReader: jest.Mocked<LotReaderPort> = {
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
  };

  return { repository, livestockReader, lotReader };
}

describe('Livestock movement use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/livestock-movement');
    const files = [
      'domain/errors.ts',
      'application/livestock-movement.ports.ts',
      'application/livestock-movement.types.ts',
      'application/livestock-movement.validation.ts',
      'application/use-cases/create-livestock-movement.use-case.ts',
      'application/use-cases/find-all-livestock-movements.use-case.ts',
      'application/use-cases/find-livestock-movement.use-case.ts',
    ];

    const contents = files.map((file) => readFileSync(join(basePath, file), 'utf8')).join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllLivestockMovementsUseCase', () => {
    it('returns only movements for the provided company', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([baseMovement]);

      const useCase = new FindAllLivestockMovementsUseCase(repository);

      await expect(useCase.execute('company-1')).resolves.toEqual([baseMovement]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-1');
    });

    it('returns an empty list for a different company scope', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([]);

      const useCase = new FindAllLivestockMovementsUseCase(repository);

      await expect(useCase.execute('company-2')).resolves.toEqual([]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('company-2');
    });
  });

  describe('FindLivestockMovementUseCase', () => {
    it('returns a movement by id within the current company', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(baseMovement);

      const useCase = new FindLivestockMovementUseCase(repository);

      await expect(useCase.execute('movement-1', 'company-1')).resolves.toEqual(baseMovement);

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('movement-1', 'company-1');
    });

    it('rejects a cross-tenant movement target', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(null);

      const useCase = new FindLivestockMovementUseCase(repository);

      await expect(useCase.execute('movement-1', 'company-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('movement-1', 'company-2');
    });
  });

  describe('CreateLivestockMovementUseCase', () => {
    let repository: jest.Mocked<LivestockMovementRepositoryPort>;
    let livestockReader: jest.Mocked<LivestockReaderPort>;
    let lotReader: jest.Mocked<LotReaderPort>;
    let useCase: CreateLivestockMovementUseCase;

    beforeEach(() => {
      ({ repository, livestockReader, lotReader } = createPorts());
      useCase = new CreateLivestockMovementUseCase(repository, livestockReader, lotReader);
    });

    it.each([
      ['livestockId', undefined],
      ['lotId', undefined],
      ['movementDate', undefined],
    ])('rejects missing required %s', async (field, value) => {
      const input: CreateLivestockMovementInput = {
        livestockId: 'livestock-1',
        lotId: 'lot-1',
        movementDate: '2026-01-12',
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute('company-1', input)).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('creates a movement inside the current company scope', async () => {
      livestockReader.findByIdForCompany.mockResolvedValue({ id: 'livestock-1' });
      lotReader.findByIdForCompany.mockResolvedValue({ id: 'lot-1' });
      repository.create.mockResolvedValue(baseMovement);

      await expect(
        useCase.execute('company-1', {
          livestockId: 'livestock-1',
          lotId: 'lot-1',
          movementDate: '2026-01-12',
          observations: 'Moved for grazing',
        }),
      ).resolves.toEqual(baseMovement);

      expect(livestockReader.findByIdForCompany).toHaveBeenCalledWith('livestock-1', 'company-1');
      expect(lotReader.findByIdForCompany).toHaveBeenCalledWith('lot-1', 'company-1');
      expect(repository.create).toHaveBeenCalledWith({
        livestockId: 'livestock-1',
        lotId: 'lot-1',
        movementDate: new Date('2026-01-12'),
        observations: 'Moved for grazing',
      });
    });

    it('rejects a livestock that belongs to another company', async () => {
      livestockReader.findByIdForCompany.mockResolvedValue(null);
      livestockReader.findById.mockResolvedValue({ id: 'livestock-1' });

      await expect(
        useCase.execute('company-1', {
          livestockId: 'livestock-1',
          lotId: 'lot-1',
          movementDate: '2026-01-12',
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(livestockReader.findByIdForCompany).toHaveBeenCalledWith('livestock-1', 'company-1');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a lot that belongs to another company', async () => {
      livestockReader.findByIdForCompany.mockResolvedValue({ id: 'livestock-1' });
      lotReader.findByIdForCompany.mockResolvedValue(null);
      lotReader.findById.mockResolvedValue({ id: 'lot-1' });

      await expect(
        useCase.execute('company-1', {
          livestockId: 'livestock-1',
          lotId: 'lot-1',
          movementDate: '2026-01-12',
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(lotReader.findByIdForCompany).toHaveBeenCalledWith('lot-1', 'company-1');
      expect(repository.create).not.toHaveBeenCalled();
    });
  });
});
