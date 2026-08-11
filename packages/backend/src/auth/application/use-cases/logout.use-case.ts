import { ClockPort, PasswordHasherPort, RefreshTokenRepositoryPort } from '../auth.ports';
import { LogoutResult } from '../auth.types';

export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(refreshTokenRaw: string): Promise<LogoutResult> {
    if (!refreshTokenRaw) {
      return { message: 'Sesión cerrada correctamente' };
    }

    const activeTokens = await this.refreshTokenRepository.findActiveForLogout();

    for (const tokenRecord of activeTokens) {
      const matches = await this.passwordHasher.verify(refreshTokenRaw, tokenRecord.tokenHash);
      if (matches.valid) {
        await this.refreshTokenRepository.revoke(tokenRecord.id, this.clock.now());
        break;
      }
    }

    return { message: 'Sesión cerrada correctamente' };
  }
}
