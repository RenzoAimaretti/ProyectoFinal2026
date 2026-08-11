import { AuthenticationFailedError, AccountLockedError, InvalidInputError } from '../../domain/errors';
import {
  AuthJwtPayload,
  AuthUserCredentials,
  AuthUserPrincipal,
  RefreshTokenRecord,
} from '../auth.types';
import {
  ClockPort,
  PasswordHasherPort,
  RandomTokenPort,
  RefreshTokenRepositoryPort,
  TokenSignerPort,
  UserCredentialsRepositoryPort,
} from '../auth.ports';
import { LoginUseCase } from './login.use-case';
import { LogoutUseCase } from './logout.use-case';
import { RefreshTokensUseCase } from './refresh-tokens.use-case';
import { ValidateUserCredentialsUseCase } from './validate-user-credentials.use-case';

const fixedNow = new Date('2026-08-11T15:00:00.000Z');

const baseUser: AuthUserCredentials = {
  id: 'user-1',
  email: 'admin@firma.com',
  passwordHash: 'argon2-hash',
  role: 'ADMIN',
  companyId: 'company-1',
  active: true,
  deleted: false,
  failedLoginAttempts: 0,
  lockedUntil: null,
};

function createPorts() {
  const userRepository: jest.Mocked<UserCredentialsRepositoryPort> = {
    findByEmail: jest.fn(),
    updateSecurityState: jest.fn(),
  };

  const refreshTokenRepository: jest.Mocked<RefreshTokenRepositoryPort> = {
    findActiveWithUsers: jest.fn(),
    findActiveForLogout: jest.fn(),
    create: jest.fn(),
    revoke: jest.fn(),
  };

  const passwordHasher: jest.Mocked<PasswordHasherPort> = {
    hash: jest.fn(),
    verify: jest.fn(),
  };

  const tokenSigner: jest.Mocked<TokenSignerPort> = {
    signAccessToken: jest.fn(),
  };

  const randomToken: jest.Mocked<RandomTokenPort> = {
    generateToken: jest.fn(),
  };

  const clock: jest.Mocked<ClockPort> = {
    now: jest.fn(),
  };

  return { userRepository, refreshTokenRepository, passwordHasher, tokenSigner, randomToken, clock };
}

describe('Auth use cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ValidateUserCredentialsUseCase', () => {
    it('returns the authenticated principal and resets security state on success', async () => {
      const { userRepository, passwordHasher, clock } = createPorts();
      clock.now.mockReturnValue(fixedNow);
      userRepository.findByEmail.mockResolvedValue({ ...baseUser, failedLoginAttempts: 2, lockedUntil: null });
      passwordHasher.verify.mockResolvedValue({ valid: true, needsRehash: false });

      const useCase = new ValidateUserCredentialsUseCase(userRepository, passwordHasher, clock);

      await expect(useCase.execute('admin@firma.com', 'Password123!')).resolves.toEqual<AuthUserPrincipal>({
        id: baseUser.id,
        email: baseUser.email,
        role: baseUser.role,
        firmaId: baseUser.companyId,
      });

      expect(userRepository.updateSecurityState).toHaveBeenCalledWith(baseUser.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    });

    it('rejects locked accounts with remaining time metadata', async () => {
      const { userRepository, passwordHasher, clock } = createPorts();
      const lockedUntil = new Date('2026-08-11T15:10:00.000Z');
      clock.now.mockReturnValue(fixedNow);
      userRepository.findByEmail.mockResolvedValue({ ...baseUser, lockedUntil });

      const useCase = new ValidateUserCredentialsUseCase(userRepository, passwordHasher, clock);

      await expect(useCase.execute('admin@firma.com', 'Password123!')).rejects.toMatchObject({
        name: 'AccountLockedError',
        remainingMinutes: 10,
        remainingSeconds: 600,
      });
    });

    it('increments failed attempts and locks after repeated failures', async () => {
      const { userRepository, passwordHasher, clock } = createPorts();
      clock.now.mockReturnValue(fixedNow);
      userRepository.findByEmail.mockResolvedValue({ ...baseUser, failedLoginAttempts: 4 });
      passwordHasher.verify.mockResolvedValue({ valid: false, needsRehash: false });

      const useCase = new ValidateUserCredentialsUseCase(userRepository, passwordHasher, clock);

      await expect(useCase.execute('admin@firma.com', 'wrong')).rejects.toBeInstanceOf(AuthenticationFailedError);

      expect(userRepository.updateSecurityState).toHaveBeenCalledWith(baseUser.id, {
        failedLoginAttempts: 5,
        lockedUntil: new Date('2026-08-11T15:15:00.000Z'),
      });
    });
  });

  describe('LoginUseCase', () => {
    it('signs an access token and stores a hashed refresh token', async () => {
      const { refreshTokenRepository, passwordHasher, tokenSigner, randomToken, clock } = createPorts();
      clock.now.mockReturnValue(fixedNow);
      randomToken.generateToken.mockReturnValue('raw-refresh');
      passwordHasher.hash.mockResolvedValue('hashed-refresh');
      tokenSigner.signAccessToken.mockReturnValue('access-token');

      const useCase = new LoginUseCase(refreshTokenRepository, passwordHasher, tokenSigner, randomToken, clock);

      await expect(useCase.execute(baseUser)).resolves.toEqual({
        accessToken: 'access-token',
        refreshToken: 'raw-refresh',
        user: {
          id: baseUser.id,
          email: baseUser.email,
          role: baseUser.role,
          firmaId: baseUser.companyId,
        },
      });

      expect(tokenSigner.signAccessToken).toHaveBeenCalledWith({
        sub: baseUser.id,
        role: baseUser.role,
        firmaId: baseUser.companyId,
        email: baseUser.email,
      });
      expect(refreshTokenRepository.create).toHaveBeenCalledWith({
        userId: baseUser.id,
        tokenHash: 'hashed-refresh',
        expiresAt: new Date('2026-08-18T15:00:00.000Z'),
      });
    });

    it('rejects missing user principals', async () => {
      const { refreshTokenRepository, passwordHasher, tokenSigner, randomToken, clock } = createPorts();
      const useCase = new LoginUseCase(refreshTokenRepository, passwordHasher, tokenSigner, randomToken, clock);

      await expect(useCase.execute(null as never)).rejects.toBeInstanceOf(InvalidInputError);
    });
  });

  describe('RefreshTokensUseCase', () => {
    it('rotates a matched refresh token and returns a fresh pair', async () => {
      const { refreshTokenRepository, passwordHasher, tokenSigner, randomToken, clock } = createPorts();
      clock.now.mockReturnValue(fixedNow);
      passwordHasher.verify.mockResolvedValue({ valid: true, needsRehash: false });
      passwordHasher.hash.mockResolvedValue('hashed-new-refresh');
      randomToken.generateToken.mockReturnValue('new-raw-refresh');
      tokenSigner.signAccessToken.mockReturnValue('new-access-token');

      const tokenRecord: RefreshTokenRecord = {
        id: 'rt-1',
        tokenHash: 'stored-hash',
        expiresAt: new Date('2026-08-18T15:00:00.000Z'),
        revokedAt: null,
        user: baseUser,
      };
      refreshTokenRepository.findActiveWithUsers.mockResolvedValue([tokenRecord]);

      const useCase = new RefreshTokensUseCase(refreshTokenRepository, passwordHasher, tokenSigner, randomToken, clock);

      await expect(useCase.execute('raw-refresh')).resolves.toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-raw-refresh',
      });

      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-1', fixedNow);
      expect(refreshTokenRepository.create).toHaveBeenCalledWith({
        userId: baseUser.id,
        tokenHash: 'hashed-new-refresh',
        expiresAt: new Date('2026-08-18T15:00:00.000Z'),
      });
    });

    it('rejects empty refresh tokens', async () => {
      const { refreshTokenRepository, passwordHasher, tokenSigner, randomToken, clock } = createPorts();
      const useCase = new RefreshTokensUseCase(refreshTokenRepository, passwordHasher, tokenSigner, randomToken, clock);

      await expect(useCase.execute('')).rejects.toBeInstanceOf(InvalidInputError);
    });
  });

  describe('LogoutUseCase', () => {
    it('revokes the matching refresh token and returns the legacy message', async () => {
      const { refreshTokenRepository, passwordHasher, clock } = createPorts();
      clock.now.mockReturnValue(fixedNow);
      passwordHasher.verify.mockResolvedValue({ valid: true, needsRehash: false });
      refreshTokenRepository.findActiveForLogout.mockResolvedValue([
        {
          id: 'rt-2',
          tokenHash: 'stored-hash',
          expiresAt: new Date('2026-08-18T15:00:00.000Z'),
          revokedAt: null,
          user: baseUser,
        },
      ]);

      const useCase = new LogoutUseCase(refreshTokenRepository, passwordHasher, clock);

      await expect(useCase.execute('raw-refresh')).resolves.toEqual({
        message: 'Sesión cerrada correctamente',
      });

      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-2', fixedNow);
    });

    it('keeps logout idempotent when no token is provided', async () => {
      const { refreshTokenRepository, passwordHasher, clock } = createPorts();
      const useCase = new LogoutUseCase(refreshTokenRepository, passwordHasher, clock);

      await expect(useCase.execute('')).resolves.toEqual({ message: 'Sesión cerrada correctamente' });
      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    });
  });
});
