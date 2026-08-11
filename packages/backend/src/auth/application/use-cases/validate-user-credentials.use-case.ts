import { AccountInactiveError, AccountLockedError, AuthenticationFailedError, InvalidInputError } from '../../domain/errors';
import { ClockPort, PasswordHasherPort, UserCredentialsRepositoryPort } from '../auth.ports';
import { AuthUserPrincipal, LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS } from '../auth.types';

function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError(`${fieldName} is required`);
  }
}

export class ValidateUserCredentialsUseCase {
  constructor(
    private readonly repository: UserCredentialsRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(email: string, password: string): Promise<AuthUserPrincipal> {
    assertRequiredString(email, 'email');
    assertRequiredString(password, 'password');

    const user = await this.repository.findByEmail(email);

    if (!user) {
      throw new AuthenticationFailedError('Usuario o contraseña incorrectos');
    }

    if (!user.active || user.deleted) {
      throw new AccountInactiveError('Cuenta desactivada o inactiva');
    }

    const now = this.clock.now();
    if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
      const remainingMs = user.lockedUntil.getTime() - now.getTime();
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      const timeText = remainingMinutes > 1 ? `${remainingMinutes} minutos` : `${remainingSeconds} segundos`;
      throw new AccountLockedError(
        `Cuenta bloqueada temporalmente por exceso de intentos fallidos. Reintente en ${timeText}.`,
        remainingSeconds,
        remainingMinutes,
      );
    }

    const passwordCheck = await this.passwordHasher.verify(password, user.passwordHash);

    if (!passwordCheck.valid) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const lockedUntil =
        failedLoginAttempts >= MAX_FAILED_ATTEMPTS
          ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
          : null;

      await this.repository.updateSecurityState(user.id, {
        failedLoginAttempts,
        lockedUntil,
      });

      throw new AuthenticationFailedError('Usuario o contraseña incorrectos');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil !== null || passwordCheck.needsRehash) {
      const update = {
        failedLoginAttempts: 0,
        lockedUntil: null,
        ...(passwordCheck.needsRehash ? { passwordHash: await this.passwordHasher.hash(password) } : {}),
      };

      await this.repository.updateSecurityState(user.id, update);
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firmaId: user.companyId,
    };
  }
}
