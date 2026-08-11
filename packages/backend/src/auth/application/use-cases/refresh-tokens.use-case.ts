import { AccountInactiveError, AuthenticationFailedError, InvalidInputError } from '../../domain/errors';
import { ClockPort, PasswordHasherPort, RandomTokenPort, RefreshTokenRepositoryPort, TokenSignerPort } from '../auth.ports';
import { AuthJwtPayload, RefreshResult, REFRESH_TOKEN_EXPIRATION_DAYS } from '../auth.types';

function assertRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInputError('Refresh token requerido');
  }
}

export class RefreshTokensUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenSigner: TokenSignerPort,
    private readonly randomToken: RandomTokenPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(refreshTokenRaw: string): Promise<RefreshResult> {
    assertRequiredString(refreshTokenRaw, 'Refresh token');

    const activeTokens = await this.refreshTokenRepository.findActiveWithUsers();
    let matchedTokenRecord = null as (typeof activeTokens)[number] | null;

    for (const tokenRecord of activeTokens) {
      const matches = await this.passwordHasher.verify(refreshTokenRaw, tokenRecord.tokenHash);
      if (matches.valid) {
        matchedTokenRecord = tokenRecord;
        break;
      }
    }

    if (!matchedTokenRecord || !matchedTokenRecord.user) {
      throw new AuthenticationFailedError('Refresh token inválido, expirado o revocado');
    }

    const user = matchedTokenRecord.user;
    if (!user.active || user.deleted) {
      throw new AccountInactiveError('Usuario inactivo');
    }

    const now = this.clock.now();
    await this.refreshTokenRepository.revoke(matchedTokenRecord.id, now);

    const payload: AuthJwtPayload = {
      sub: user.id,
      role: user.role,
      firmaId: user.companyId,
      email: user.email,
    };

    const accessToken = this.tokenSigner.signAccessToken(payload);
    const refreshToken = this.randomToken.generateToken();
    const tokenHash = await this.passwordHasher.hash(refreshToken);
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
