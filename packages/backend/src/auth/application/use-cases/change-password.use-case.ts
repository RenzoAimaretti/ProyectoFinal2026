import { AuthenticationFailedError, InvalidInputError } from '../../domain/errors';
import { PasswordHasherPort, UserCredentialsRepositoryPort } from '../auth.ports';

function assertPassword(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }

  if (value.length < 8) {
    throw new InvalidInputError(`${fieldName} must be at least 8 characters long`);
  }

  return value;
}

export class ChangePasswordUseCase {
  constructor(
    private readonly repository: UserCredentialsRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new InvalidInputError('userId is required');
    }

    const current = assertPassword(currentPassword, 'currentPassword');
    const next = assertPassword(newPassword, 'newPassword');

    const user = await this.repository.findById(userId);
    if (!user) {
      throw new AuthenticationFailedError('Usuario no encontrado');
    }

    const check = await this.passwordHasher.verify(current, user.passwordHash);
    if (!check.valid) {
      throw new AuthenticationFailedError('La contraseña actual es incorrecta');
    }

    const passwordHash = await this.passwordHasher.hash(next);

    await this.repository.updateSecurityState(userId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordHash,
      mustChangePassword: false,
    });
  }
}
