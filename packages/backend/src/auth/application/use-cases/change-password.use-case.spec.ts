import { InvalidInputError, AuthenticationFailedError } from '../../domain/errors';
import {
  AuthUserCredentials,
  UpdateSecurityStateInput,
} from '../auth.types';
import { PasswordHasherPort, UserCredentialsRepositoryPort } from '../auth.ports';
import { ChangePasswordUseCase } from './change-password.use-case';

const baseUser: AuthUserCredentials = {
  id: 'user-1',
  email: 'client@campo.com',
  passwordHash: 'argon2-hash',
  role: 'PRODUCTOR',
  tenantId: 'tenant-1',
  firmaId: 'company-1',
  active: true,
  deleted: false,
  failedLoginAttempts: 0,
  lockedUntil: null,
  mustChangePassword: true,
};

function createPorts() {
  const repository: jest.Mocked<UserCredentialsRepositoryPort> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updateSecurityState: jest.fn(),
  };

  const passwordHasher: jest.Mocked<PasswordHasherPort> = {
    hash: jest.fn(),
    verify: jest.fn(),
  };

  return { repository, passwordHasher };
}

describe('ChangePasswordUseCase', () => {
  it('verifies the current password, hashes the new one and clears the flag', async () => {
    const { repository, passwordHasher } = createPorts();
    repository.findById.mockResolvedValue(baseUser);
    passwordHasher.verify.mockResolvedValue({ valid: true, needsRehash: false });
    passwordHasher.hash.mockResolvedValue('new-hash');

    const useCase = new ChangePasswordUseCase(repository, passwordHasher);

    await expect(
      useCase.execute('user-1', 'unit-test-password', 'NuevaClave123!'),
    ).resolves.toBeUndefined();

    expect(passwordHasher.verify).toHaveBeenCalledWith(
      'unit-test-password',
      baseUser.passwordHash,
    );
    expect(repository.updateSecurityState).toHaveBeenCalledWith('user-1', {
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordHash: 'new-hash',
      mustChangePassword: false,
    } satisfies UpdateSecurityStateInput);
  });

  it('rejects an incorrect current password', async () => {
    const { repository, passwordHasher } = createPorts();
    repository.findById.mockResolvedValue(baseUser);
    passwordHasher.verify.mockResolvedValue({ valid: false, needsRehash: false });

    const useCase = new ChangePasswordUseCase(repository, passwordHasher);

    await expect(
      useCase.execute('user-1', 'WrongPass1!', 'NuevaClave123!'),
    ).rejects.toBeInstanceOf(AuthenticationFailedError);
    expect(repository.updateSecurityState).not.toHaveBeenCalled();
  });

  it('rejects a new password shorter than 8 characters', async () => {
    const { repository, passwordHasher } = createPorts();
    const useCase = new ChangePasswordUseCase(repository, passwordHasher);

    await expect(
      useCase.execute('user-1', 'unit-test-password', 'short'),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(passwordHasher.verify).not.toHaveBeenCalled();
  });

  it('rejects an unknown user', async () => {
    const { repository, passwordHasher } = createPorts();
    repository.findById.mockResolvedValue(null);

    const useCase = new ChangePasswordUseCase(repository, passwordHasher);

    await expect(
      useCase.execute('user-9', 'unit-test-password', 'NuevaClave123!'),
    ).rejects.toBeInstanceOf(AuthenticationFailedError);
  });
});
