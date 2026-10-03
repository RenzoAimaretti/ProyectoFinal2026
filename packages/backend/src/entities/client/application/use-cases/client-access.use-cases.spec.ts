import {
  DuplicateEntityError,
  EntityNotFoundError,
  InvalidInputError,
} from '../../domain/errors';
import { ClientRepositoryPort } from '../client.ports';
import { CreateClientWithAccessUseCase } from './create-client-with-access.use-case';
import { FindClientProfileUseCase } from './find-client-profile.use-case';
import { UpdateClientProfileUseCase } from './update-client-profile.use-case';

const mockAccess = {
  id: 'client-1',
  name: 'Juan Perez',
  firstName: 'Juan',
  lastName: 'Perez',
  email: 'juan@campo.com',
  phone: null,
  address: null,
  farms: [],
  lots: [],
};

function createRepository(): jest.Mocked<ClientRepositoryPort> {
  return {
    findAllByTenantId: jest.fn(),
    findByIdForTenant: jest.fn(),
    findByNameAndTenantId: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn(),
    createWithAccess: jest.fn(),
    findUserByEmail: jest.fn(),
    findProfileByUserId: jest.fn(),
    updateProfileForUserId: jest.fn(),
    updateForTenant: jest.fn(),
  };
}

function createHasher() {
  return { hash: jest.fn().mockResolvedValue('argon2-hash') };
}

describe('Client access use cases', () => {
  describe('CreateClientWithAccessUseCase', () => {
    it('hashes the password, defaults it and delegates the atomic creation', async () => {
      const repository = createRepository();
      const hasher = createHasher();
      repository.findUserByEmail.mockResolvedValue(null);
      repository.createWithAccess.mockResolvedValue(mockAccess);

      const useCase = new CreateClientWithAccessUseCase(repository as never, hasher);

      const result = await useCase.execute('tenant-1', 'company-1', {
        email: 'Juan@Campo.com',
        firstName: 'Juan',
        lastName: 'Perez',
        farmName: 'El Ombu',
        lots: [{ name: 'Lote 1', area: 10 }],
      });

      expect(result).toMatchObject(mockAccess);
      // No hardcoded default: a non-empty password is generated and hashed.
      expect(typeof result.password).toBe('string');
      expect(result.password.length).toBeGreaterThanOrEqual(8);
      expect(hasher.hash).toHaveBeenCalledWith(result.password);
      expect(repository.createWithAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          companyId: 'company-1',
          email: 'juan@campo.com',
          firstName: 'Juan',
          lastName: 'Perez',
          farmName: 'El Ombu',
          passwordHash: 'argon2-hash',
          lots: [{ name: 'Lote 1', area: 10, coords: null }],
        }),
      );
    });

    it('rejects duplicate emails', async () => {
      const repository = createRepository();
      const hasher = createHasher();
      repository.findUserByEmail.mockResolvedValue({ id: 'user-1' });

      const useCase = new CreateClientWithAccessUseCase(repository as never, hasher);

      await expect(
        useCase.execute('tenant-1', 'company-1', {
          email: 'juan@campo.com',
          firstName: 'Juan',
          lastName: 'Perez',
          farmName: 'El Ombu',
          lots: [{ name: 'Lote 1', area: 10 }],
        }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
      expect(repository.createWithAccess).not.toHaveBeenCalled();
    });

    it('rejects missing required fields and empty lots', async () => {
      const repository = createRepository();
      const hasher = createHasher();
      const useCase = new CreateClientWithAccessUseCase(repository as never, hasher);

      await expect(
        useCase.execute('tenant-1', 'company-1', {
          email: 'juan@campo.com',
          firstName: '',
          lastName: 'Perez',
          farmName: 'El Ombu',
          lots: [{ name: 'Lote 1', area: 10 }],
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);

      await expect(
        useCase.execute('tenant-1', 'company-1', {
          email: 'juan@campo.com',
          firstName: 'Juan',
          lastName: 'Perez',
          farmName: 'El Ombu',
          lots: [],
        }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });
  });

  describe('FindClientProfileUseCase', () => {
    it('rejects a user not linked to a client', async () => {
      const repository = createRepository();
      repository.findProfileByUserId.mockResolvedValue(null);

      const useCase = new FindClientProfileUseCase(repository);

      await expect(useCase.execute('user-1')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });
  });

  describe('UpdateClientProfileUseCase', () => {
    it('rejects empty payloads and users without a linked client', async () => {
      const repository = createRepository();
      const useCase = new UpdateClientProfileUseCase(repository);

      await expect(useCase.execute('user-1', {})).rejects.toBeInstanceOf(
        InvalidInputError,
      );

      repository.findByUserId.mockResolvedValue(null);
      await expect(
        useCase.execute('user-1', { phone: '123' }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('normalizes and updates the profile', async () => {
      const repository = createRepository();
      repository.findByUserId.mockResolvedValue({
        id: 'client-1',
      } as never);
      repository.updateProfileForUserId.mockResolvedValue({
        ...mockAccess,
        phone: '999',
      } as never);

      const useCase = new UpdateClientProfileUseCase(repository);

      await expect(
        useCase.execute('user-1', { phone: '999', address: '  ' }),
      ).resolves.toMatchObject({ phone: '999' });

      expect(repository.updateProfileForUserId).toHaveBeenCalledWith('user-1', {
        phone: '999',
        address: null,
      });
    });
  });
});
