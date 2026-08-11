import { InvalidInputError } from '../../domain/errors';
import { ClockPort, PasswordHasherPort, RandomTokenPort, RefreshTokenRepositoryPort, TokenSignerPort } from '../auth.ports';
import {
  AuthJwtPayload,
  AuthUserCredentials,
  AuthUserPrincipal,
  LoginResult,
  REFRESH_TOKEN_EXPIRATION_DAYS,
} from '../auth.types';

function assertUserPrincipal(
  user: AuthUserCredentials | AuthUserPrincipal | null | undefined,
): asserts user is AuthUserCredentials | AuthUserPrincipal {
  if (!user || typeof user !== 'object') {
    throw new InvalidInputError('user is required');
  }

  const candidate = user as Partial<AuthUserPrincipal & AuthUserCredentials>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.email !== 'string' ||
    typeof candidate.role !== 'string' ||
    typeof candidate.companyId !== 'string' && typeof candidate.firmaId !== 'string'
  ) {
    throw new InvalidInputError('user is required');
  }
}

function resolveFirmaId(user: AuthUserCredentials | AuthUserPrincipal): string {
  if ('firmaId' in user) {
    return user.firmaId;
  }

  return user.companyId;
}

export class LoginUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenSigner: TokenSignerPort,
    private readonly randomToken: RandomTokenPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(user: AuthUserPrincipal | AuthUserCredentials): Promise<LoginResult> {
    assertUserPrincipal(user);

    const payload: AuthJwtPayload = {
      sub: user.id,
      role: user.role,
      firmaId: resolveFirmaId(user),
      email: user.email,
    };

    const accessToken = this.tokenSigner.signAccessToken(payload);
    const refreshToken = this.randomToken.generateToken();
    const tokenHash = await this.passwordHasher.hash(refreshToken);
    const expiresAt = new Date(this.clock.now().getTime() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firmaId: resolveFirmaId(user),
      },
    };
  }
}
