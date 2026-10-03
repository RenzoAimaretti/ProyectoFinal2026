import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
  InvalidRelationError,
} from '../../domain/errors';
import { ClientReaderPort, FarmRepositoryPort } from '../farm.ports';
import { CreateFarmInput, UpdateFarmInput } from '../farm.types';
import { CreateFarmUseCase } from './create-farm.use-case';
import { FindAllFarmsUseCase } from './find-all-farms.use-case';
import { FindFarmUseCase } from './find-farm.use-case';
import { UpdateFarmUseCase } from './update-farm.use-case';

const baseFarm = {
  id: 'farm-1',
  clientId: 'client-1',
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
    findAllByTenantId: jest.fn(),
    findAllByClientId: jest.fn(),
    findByIdForTenant: jest.fn(),
    findByNameAndClientId: jest.fn(),
    create: jest.fn(),
    updateForTenant: jest.fn(),
  };

  const clientReader: jest.Mocked<ClientReaderPort> = {
    findByIdForTenant: jest.fn(),
  };

  return { repository, clientReader };
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
    it('returns only farms for the provided tenant', async () => {
      const { repository } = createPorts();
      repository.findAllByTenantId.mockResolvedValue([baseFarm]);

      const useCase = new FindAllFarmsUseCase(repository);

      await expect(useCase.execute('tenant-1')).resolves.toEqual([baseFarm]);

      expect(repository.findAllByTenantId).toHaveBeenCalledWith('tenant-1');
    });

    it('returns an empty list when there are no farms', async () => {
      const { repository } = createPorts();
      repository.findAllByTenantId.mockResolvedValue([]);

      const useCase = new FindAllFarmsUseCase(repository);

      await expect(useCase.execute('tenant-2')).resolves.toEqual([]);

      expect(repository.findAllByTenantId).toHaveBeenCalledWith('tenant-2');
    });
  });

  describe('FindFarmUseCase', () => {
    it('returns a farm by id within the current tenant', async () => {
      const { repository } = createPorts();
      repository.findByIdForTenant.mockResolvedValue(baseFarm);

      const useCase = new FindFarmUseCase(repository);

      await expect(useCase.execute('farm-1', 'tenant-1')).resolves.toEqual(
        baseFarm,
      );

      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'farm-1',
        'tenant-1',
      );
    });

    it('rejects missing farm outside the current tenant', async () => {
      const { repository } = createPorts();
      repository.findByIdForTenant.mockResolvedValue(null);

      const useCase = new FindFarmUseCase(repository);

      await expect(useCase.execute('farm-1', 'tenant-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'farm-1',
        'tenant-2',
      );
    });
  });

  describe('CreateFarmUseCase', () => {
    let repository: jest.Mocked<FarmRepositoryPort>;
    let clientReader: jest.Mocked<ClientReaderPort>;
    let useCase: CreateFarmUseCase;

    beforeEach(() => {
      ({ repository, clientReader } = createPorts());
      useCase = new CreateFarmUseCase(repository, clientReader);
    });

    it.each([
      ['name', undefined],
      ['location', ''],
      ['surface', 0],
      ['clientId', ''],
    ])('rejects invalid required %s', async (field, value) => {
      const input: CreateFarmInput = {
        name: 'North Field',
        location: 'North road',
        surface: 120.5,
        clientId: 'client-1',
      };

      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute('tenant-1', input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects a client outside the authenticated tenant', async () => {
      clientReader.findByIdForTenant.mockResolvedValue(null);

      await expect(
        useCase.execute('tenant-1', {
          name: 'North Field',
          location: 'North road',
          surface: 120.5,
          clientId: 'client-2',
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);

      expect(clientReader.findByIdForTenant).toHaveBeenCalledWith(
        'client-2',
        'tenant-1',
      );
    });

    it('rejects duplicate farm name within the same client', async () => {
      clientReader.findByIdForTenant.mockResolvedValue({ id: 'client-1' });
      repository.findByNameAndClientId.mockResolvedValue(baseFarm);

      await expect(
        useCase.execute('tenant-1', {
          name: 'North Field',
          location: 'North road',
          surface: 120.5,
          clientId: 'client-1',
        }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
    });

    it('creates farm', async () => {
      clientReader.findByIdForTenant.mockResolvedValue({ id: 'client-1' });
      repository.findByNameAndClientId.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseFarm);

      await expect(
        useCase.execute('tenant-1', {
          name: 'North Field',
          location: 'North road',
          surface: 120.5,
          clientId: 'client-1',
        }),
      ).resolves.toEqual(baseFarm);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'North Field',
        location: 'North road',
        clientId: 'client-1',
        surface: 120.5,
      });
    });
  });

  describe('UpdateFarmUseCase', () => {
    let repository: jest.Mocked<FarmRepositoryPort>;
    let clientReader: jest.Mocked<ClientReaderPort>;
    let useCase: UpdateFarmUseCase;

    beforeEach(() => {
      ({ repository, clientReader } = createPorts());
      useCase = new UpdateFarmUseCase(repository, clientReader);
    });

    it.each([
      undefined,
      {},
      { clientId: 'client-1', name: '   ' },
      { clientId: 'client-1', surface: 0 },
    ])('rejects invalid update payload %p', async (input) => {
      if (input && typeof input === 'object' && !Array.isArray(input)) {
        repository.findByIdForTenant.mockResolvedValue(baseFarm);
      }

      await expect(
        useCase.execute('farm-1', 'tenant-1', input as UpdateFarmInput),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('requires clientId on update', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseFarm);

      await expect(
        useCase.execute('farm-1', 'tenant-1', {
          name: 'New name',
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);

      expect(repository.findByIdForTenant).not.toHaveBeenCalled();
    });

    it('rejects missing farm', async () => {
      repository.findByIdForTenant.mockResolvedValue(null);

      await expect(
        useCase.execute('farm-1', 'tenant-1', {
          name: 'New name',
          clientId: 'client-1',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects a client outside the authenticated tenant', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseFarm);
      clientReader.findByIdForTenant.mockResolvedValue(null);

      await expect(
        useCase.execute('farm-1', 'tenant-1', {
          clientId: 'client-2',
        }),
      ).rejects.toBeInstanceOf(InvalidRelationError);
    });

    it('updates farm', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseFarm);
      clientReader.findByIdForTenant.mockResolvedValue({ id: 'client-1' });
      repository.updateForTenant.mockResolvedValue({
        ...baseFarm,
        name: 'South Field',
      });

      await expect(
        useCase.execute('farm-1', 'tenant-1', {
          name: 'South Field',
          clientId: 'client-1',
        }),
      ).resolves.toEqual({ ...baseFarm, name: 'South Field' });

      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'farm-1',
        'tenant-1',
      );
      expect(repository.updateForTenant).toHaveBeenCalledWith(
        'farm-1',
        'tenant-1',
        {
          name: 'South Field',
          clientId: 'client-1',
        },
      );
    });
  });
});
