import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as argon2 from 'argon2';
import { DuplicateEntityError, EntityNotFoundError, InvalidInputError } from '../../domain/errors';
import { CompanyReaderPort, TenantReaderPort, UserRepositoryPort } from '../user.ports';
import { CreateUserInput, UpdateUserInput, UserRecord } from '../user.types';
import { CreateUserUseCase } from './create-user.use-case';
import { FindAllUsersUseCase } from './find-all-users.use-case';
import { FindUserUseCase } from './find-user.use-case';
import { UpdateUserUseCase } from './update-user.use-case';

jest.mock('argon2', () => ({
  hash: jest.fn(),
}));

const baseUser: UserRecord = {
  id: 'user-1',
  tenantId: 'tenant-1',
  username: 'juan',
  email: 'juan@firma.com',
  passwordHash: 'hashed-password',
  role: 'ADMIN',
  failedLoginAttempts: 0,
  lockedUntil: null,
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

function createPorts() {
  const repository: jest.Mocked<UserRepositoryPort> = {
    findAll: jest.fn(),
    findAllByCompanyId: jest.fn(),
    findById: jest.fn(),
    findByIdForCompany: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateForCompany: jest.fn(),
  };

  const tenantReader: jest.Mocked<TenantReaderPort> = {
    findById: jest.fn(),
  };

  const companyReader: jest.Mocked<CompanyReaderPort> = {
    findByIdForTenant: jest.fn(),
  };

  return { repository, tenantReader, companyReader };
}

describe('User use cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps application and domain free of NestJS and Prisma imports', () => {
    const basePath = join(process.cwd(), 'src/entities/user');
    const files = [
      'domain/errors.ts',
      'application/user.ports.ts',
      'application/user.types.ts',
      'application/user.validation.ts',
      'application/use-cases/find-all-users.use-case.ts',
      'application/use-cases/find-user.use-case.ts',
      'application/use-cases/create-user.use-case.ts',
      'application/use-cases/update-user.use-case.ts',
    ];

    const contents = files.map((file) => readFileSync(join(basePath, file), 'utf8')).join('\n');

    expect(contents).not.toContain('@nestjs/common');
    expect(contents).not.toContain('PrismaService');
    expect(contents).not.toContain('prisma/generated');
  });

  describe('FindAllUsersUseCase', () => {
    it('returns only users for the provided tenant', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([baseUser]);

      const useCase = new FindAllUsersUseCase(repository);

      await expect((useCase as any).execute('tenant-1')).resolves.toEqual([baseUser]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('tenant-1');
    });

    it('returns an empty list for another tenant scope', async () => {
      const { repository } = createPorts();
      repository.findAllByCompanyId.mockResolvedValue([]);

      const useCase = new FindAllUsersUseCase(repository);

      await expect((useCase as any).execute('tenant-2')).resolves.toEqual([]);

      expect(repository.findAllByCompanyId).toHaveBeenCalledWith('tenant-2');
    });
  });

  describe('FindUserUseCase', () => {
    it('returns a user by id within the current tenant', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(baseUser);

      const useCase = new FindUserUseCase(repository);

      await expect((useCase as any).execute('user-1', 'tenant-1')).resolves.toEqual(baseUser);

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('user-1', 'tenant-1');
    });

    it('rejects missing users outside the current tenant', async () => {
      const { repository } = createPorts();
      repository.findByIdForCompany.mockResolvedValue(null);

      const useCase = new FindUserUseCase(repository);

      await expect((useCase as any).execute('user-1', 'tenant-2')).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('user-1', 'tenant-2');
    });
  });

  describe('CreateUserUseCase', () => {
    let repository: jest.Mocked<UserRepositoryPort>;
    let tenantReader: jest.Mocked<TenantReaderPort>;
    let companyReader: jest.Mocked<CompanyReaderPort>;
    let useCase: CreateUserUseCase;

    beforeEach(() => {
      ({ repository, tenantReader, companyReader } = createPorts());
      useCase = new CreateUserUseCase(repository, tenantReader, companyReader);
    });

    it('creates a user and hashes the password', async () => {
      tenantReader.findById.mockResolvedValue({ id: 'tenant-1' });
      companyReader.findByIdForTenant.mockResolvedValue({ id: 'company-1' });
      repository.findByEmail.mockResolvedValue(null);
      repository.findByUsername.mockResolvedValue(null);
      repository.create.mockResolvedValue(baseUser);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-123');

      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          companyId: 'company-1',
          email: 'juan@firma.com',
          password: 'Password123!',
          role: 'ADMIN',
        }),
      ).resolves.toEqual(baseUser);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          companyId: 'company-1',
          email: 'juan@firma.com',
          passwordHash: 'hashed-123',
          role: 'ADMIN',
          active: true,
        }),
      );
    });

    it('falls back to username as email when email is omitted', async () => {
      tenantReader.findById.mockResolvedValue({ id: 'tenant-1' });
      companyReader.findByIdForTenant.mockResolvedValue({ id: 'company-1' });
      repository.findByEmail.mockResolvedValue(null);
      repository.findByUsername.mockResolvedValue(null);
      repository.create.mockResolvedValue({ ...baseUser, email: 'juan' });
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-123');

      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          companyId: 'company-1',
          username: 'juan',
          password: 'Password123!',
          role: 'OPERARIO',
        }),
      ).resolves.toEqual({ ...baseUser, email: 'juan' });

      expect(repository.create).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        companyId: 'company-1',
        username: 'juan',
        email: 'juan',
        passwordHash: 'hashed-123',
        role: 'OPERARIO',
        active: true,
      });
    });

    it.each([
      ['tenantId', { tenantId: ' ', email: 'juan@firma.com', password: 'Password123!', role: 'ADMIN' }],
      ['password', { tenantId: 'tenant-1', email: 'juan@firma.com', password: ' ', role: 'ADMIN' }],
      ['role', { tenantId: 'tenant-1', email: 'juan@firma.com', password: 'Password123!', role: 'NO_EXISTE' }],
    ])('rejects invalid %s', async (_field, input) => {
      const normalizedInput = input as CreateUserInput;
      tenantReader.findById.mockResolvedValue({ id: 'tenant-1' });

      await expect(useCase.execute(normalizedInput)).rejects.toBeInstanceOf(InvalidInputError);
    });

    it('rejects a missing tenant', async () => {
      tenantReader.findById.mockResolvedValue(null);
      repository.findByEmail.mockResolvedValue(null);

      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          companyId: 'company-1',
          email: 'juan@firma.com',
          password: 'Password123!',
          role: 'ADMIN',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it('rejects a company outside the caller tenant before creating the user', async () => {
      tenantReader.findById.mockResolvedValue({ id: 'tenant-1' });
      companyReader.findByIdForTenant.mockResolvedValue(null);

      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          companyId: 'company-2',
          email: 'juan@firma.com',
          password: 'Password123!',
          role: 'OPERARIO',
        }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);

      expect(companyReader.findByIdForTenant).toHaveBeenCalledWith('company-2', 'tenant-1');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects duplicate usernames', async () => {
      tenantReader.findById.mockResolvedValue({ id: 'tenant-1' });
      companyReader.findByIdForTenant.mockResolvedValue({ id: 'company-1' });
      repository.findByEmail.mockResolvedValue(null);
      repository.findByUsername.mockResolvedValue(baseUser);

      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          companyId: 'company-1',
          username: 'juan',
          password: 'Password123!',
          role: 'ADMIN',
        }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);
    });
  });

  describe('UpdateUserUseCase', () => {
    let repository: jest.Mocked<UserRepositoryPort>;
    let useCase: UpdateUserUseCase;

    beforeEach(() => {
      ({ repository } = createPorts());
      useCase = new UpdateUserUseCase(repository);
    });

    it.each([undefined, {}])('rejects empty payload %p', async (input) => {
      await expect((useCase as any).execute('user-1', 'tenant-1', input as UpdateUserInput)).rejects.toBeInstanceOf(
        InvalidInputError,
      );
    });

    it('rejects missing users outside the current tenant', async () => {
      repository.findByIdForCompany.mockResolvedValue(null);

      await expect(
        (useCase as any).execute('user-1', 'tenant-2', { username: 'nuevo' }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('user-1', 'tenant-2');
    });

    it('updates a user and hashes a new password inside the current tenant', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseUser);
      repository.findByUsername.mockResolvedValue(null);
      repository.updateForCompany.mockResolvedValue({ ...baseUser, username: 'nuevo' });
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-new');

      await expect(
        (useCase as any).execute('user-1', 'tenant-1', {
          username: 'nuevo',
          password: 'NewPassword123!',
          role: 'PRODUCTOR',
          active: false,
        }),
      ).resolves.toEqual({ ...baseUser, username: 'nuevo' });

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(repository.updateForCompany).toHaveBeenCalledWith('user-1', 'tenant-1', {
        username: 'nuevo',
        passwordHash: 'hashed-new',
        role: 'PRODUCTOR',
        active: false,
      });
    });

    it('rejects duplicate usernames', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseUser);
      repository.findByUsername.mockResolvedValue({ ...baseUser, id: 'other-user' });

      await expect(
        (useCase as any).execute('user-1', 'tenant-1', {
          username: 'nuevo',
        }),
      ).rejects.toBeInstanceOf(DuplicateEntityError);

      expect(repository.findByIdForCompany).toHaveBeenCalledWith('user-1', 'tenant-1');
    });

    it('rejects invalid usernames and roles', async () => {
      repository.findByIdForCompany.mockResolvedValue(baseUser);

      await expect(
        (useCase as any).execute('user-1', 'tenant-1', { username: ' ' }),
      ).rejects.toBeInstanceOf(InvalidInputError);

      await expect(
        (useCase as any).execute('user-1', 'tenant-1', { role: 'NO_EXISTE' as UserRecord['role'] }),
      ).rejects.toBeInstanceOf(InvalidInputError);
    });
  });
});
