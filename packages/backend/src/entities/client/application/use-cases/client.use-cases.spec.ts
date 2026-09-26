import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { ClientRepositoryPort } from '../client.ports';
import { CreateClientInput, UpdateClientInput } from '../client.types';
import { CreateClientUseCase } from './create-client.use-case';
import { FindAllClientsUseCase } from './find-all-clients.use-case';
import { FindClientUseCase } from './find-client.use-case';
import { UpdateClientUseCase } from './update-client.use-case';

const baseClient = {
  id: 'client-1',
  tenantId: 'tenant-1',
  name: 'Acme S.A.',
  cuit: '30-12345678-9',
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const otherTenantClient = {
  ...baseClient,
  id: 'client-2',
  tenantId: 'tenant-2',
};

function createRepository(): jest.Mocked<ClientRepositoryPort> {
  return {
    findAllByTenantId: jest.fn(),
    findByIdForTenant: jest.fn(),
    findByNameAndTenantId: jest.fn(),
    create: jest.fn(),
    updateForTenant: jest.fn(),
  };
}

describe('Client use cases', () => {
  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/client');
    const files = [
      'domain/errors.ts',
      'application/client.ports.ts',
      'application/client.types.ts',
      'application/client.validation.ts',
      'application/use-cases/create-client.use-case.ts',
      'application/use-cases/find-all-clients.use-case.ts',
      'application/use-cases/find-client.use-case.ts',
      'application/use-cases/update-client.use-case.ts',
    ];

    const contents = files
      .map((file) => readFileSync(join(basePath, file), 'utf8'))
      .join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllClientsUseCase', () => {
    it('returns only clients for the provided tenant', async () => {
      const repository = createRepository();
      repository.findAllByTenantId.mockResolvedValue([baseClient]);

      const useCase = new FindAllClientsUseCase(repository);

      await expect(useCase.execute('tenant-1')).resolves.toEqual([baseClient]);
      expect(repository.findAllByTenantId).toHaveBeenCalledWith('tenant-1');
    });

    it('returns an empty list when the tenant has no clients', async () => {
      const repository = createRepository();
      repository.findAllByTenantId.mockResolvedValue([]);

      const useCase = new FindAllClientsUseCase(repository);

      await expect(useCase.execute('tenant-2')).resolves.toEqual([]);
      expect(repository.findAllByTenantId).toHaveBeenCalledWith('tenant-2');
    });
  });

  describe('FindClientUseCase', () => {
    it('returns a client by id within the current tenant', async () => {
      const repository = createRepository();
      repository.findByIdForTenant.mockResolvedValue(baseClient);

      const useCase = new FindClientUseCase(repository);

      await expect(useCase.execute('client-1', 'tenant-1')).resolves.toEqual(
        baseClient,
      );
      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'client-1',
        'tenant-1',
      );
    });

    it('rejects a client outside the current tenant', async () => {
      const repository = createRepository();
      repository.findByIdForTenant.mockResolvedValue(null);

      const useCase = new FindClientUseCase(repository);

      await expect(
        useCase.execute('client-1', 'tenant-2'),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'client-1',
        'tenant-2',
      );
    });
  });

  describe('CreateClientUseCase', () => {
    let repository: jest.Mocked<ClientRepositoryPort>;
    let useCase: CreateClientUseCase;

    beforeEach(() => {
      repository = createRepository();
      useCase = new CreateClientUseCase(repository);
    });

    it.each([
      ['name', undefined],
      ['name', ''],
    ])('rejects invalid required %s', async (field, value) => {
      const input: CreateClientInput = { name: 'Acme S.A.' };
      (input as Record<string, unknown>)[field] = value;

      await expect(useCase.execute('tenant-1', input)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects a duplicate client name within the tenant', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(baseClient);

      await expect(
        useCase.execute('tenant-1', { name: 'Acme S.A.' }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
      expect(repository.findByNameAndTenantId).toHaveBeenCalledWith(
        'Acme S.A.',
        'tenant-1',
      );
    });

    it('creates a client with the authenticated tenant', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseClient);

      await expect(
        useCase.execute('tenant-1', {
          name: 'Acme S.A.',
          cuit: '30-12345678-9',
        }),
      ).resolves.toEqual(baseClient);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Acme S.A.',
        cuit: '30-12345678-9',
        tenantId: 'tenant-1',
      });
      expect(repository.findByNameAndTenantId).toHaveBeenCalledWith(
        'Acme S.A.',
        'tenant-1',
      );
    });

    it('allows the same client name in another tenant', async () => {
      repository.findByNameAndTenantId.mockResolvedValue(null);
      repository.create.mockResolvedValue(otherTenantClient);

      await expect(
        useCase.execute('tenant-2', { name: 'Acme S.A.' }),
      ).resolves.toEqual(otherTenantClient);

      expect(repository.findByNameAndTenantId).toHaveBeenCalledWith(
        'Acme S.A.',
        'tenant-2',
      );
    });
  });

  describe('UpdateClientUseCase', () => {
    let repository: jest.Mocked<ClientRepositoryPort>;
    let useCase: UpdateClientUseCase;

    beforeEach(() => {
      repository = createRepository();
      useCase = new UpdateClientUseCase(repository);
    });

    it.each([undefined, {}])(
      'rejects empty update payload %p',
      async (input) => {
        await expect(
          useCase.execute('client-1', 'tenant-1', input as UpdateClientInput),
        ).rejects.toBeInstanceOf(InvalidInputError);
      },
    );

    it('rejects a client outside the current tenant', async () => {
      repository.findByIdForTenant.mockResolvedValue(null);

      await expect(
        useCase.execute('client-1', 'tenant-2', { name: 'New name' }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
      expect(repository.updateForTenant).not.toHaveBeenCalled();
    });

    it('rejects invalid field values', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseClient);

      await expect(
        useCase.execute('client-1', 'tenant-1', { name: '   ' }),
      ).rejects.toBeInstanceOf(InvalidInputError);
      expect(repository.updateForTenant).not.toHaveBeenCalled();
    });

    it('updates a client within the tenant', async () => {
      repository.findByIdForTenant.mockResolvedValue(baseClient);
      repository.updateForTenant.mockResolvedValue({
        ...baseClient,
        name: 'New name',
        active: false,
      });

      await expect(
        useCase.execute('client-1', 'tenant-1', {
          name: 'New name',
          active: false,
        }),
      ).resolves.toEqual({ ...baseClient, name: 'New name', active: false });

      expect(repository.findByIdForTenant).toHaveBeenCalledWith(
        'client-1',
        'tenant-1',
      );
      expect(repository.updateForTenant).toHaveBeenCalledWith(
        'client-1',
        'tenant-1',
        { name: 'New name', active: false },
      );
    });
  });
});
