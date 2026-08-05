import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../entities/user/domain/user-role';
import { USER_CREDENTIALS_REPOSITORY } from './ports/user-credentials.repository';
import { REFRESH_TOKEN_REPOSITORY } from './ports/refresh-token.repository';

// T-F3-01 — contract-locking spec (REQ-F3-02, REQ-T-06): mockea los puertos
// (plain objects + jest.fn(), REQ-T-03) en vez de PrismaService. Congela el
// contrato byte-idéntico del legacy (REQ-F3-03): MAX_FAILED_ATTEMPTS=5,
// LOCKOUT_MINUTES=15, payload 423 con tiempo restante, migración bcrypt→argon2,
// O(n) scan del refresh (findActiveWithUser), logout con su propio scan
// (findAllActive — el legacy NO filtra por expiración ni incluye user), rotación.
describe('AuthService', () => {
  let service: AuthService;
  let userCredentialsRepository: any;
  let refreshTokenRepository: any;
  let jwtService: any;

  const mockUser = {
    id: 'user-uuid-1',
    companyId: 'company-uuid-1',
    email: 'admin@firma.com',
    passwordHash: '',
    role: UserRole.ADMIN,
    failedLoginAttempts: 0,
    lockedUntil: null,
    active: true,
    deleted: false,
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash('Password123!');
  });

  beforeEach(async () => {
    userCredentialsRepository = {
      findByEmail: jest.fn(),
      update: jest.fn(),
    };
    refreshTokenRepository = {
      create: jest.fn(),
      findActiveWithUser: jest.fn(),
      findAllActive: jest.fn(),
      revoke: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_CREDENTIALS_REPOSITORY, useValue: userCredentialsRepository },
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: refreshTokenRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('validateUserCredentials', () => {
    it('debería validar credenciales correctas y retornar el usuario', async () => {
      userCredentialsRepository.findByEmail.mockResolvedValue(mockUser);

      const user = await service.validateUserCredentials(
        'admin@firma.com',
        'Password123!',
      );

      expect(user).toBeDefined();
      expect(user.id).toEqual(mockUser.id);
      expect(userCredentialsRepository.findByEmail).toHaveBeenCalledWith(
        'admin@firma.com',
      );
    });

    it('debería rechazar con 401 si el usuario no existe', async () => {
      userCredentialsRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUserCredentials('inexistente@firma.com', 'Password123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debería rechazar con 401 si la cuenta está desactivada o eliminada', async () => {
      userCredentialsRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        active: false,
      });

      await expect(
        service.validateUserCredentials('admin@firma.com', 'Password123!'),
      ).rejects.toThrow('Cuenta desactivada o inactiva');
    });

    it('debería rechazar con 401 si la contraseña es incorrecta e incrementar failedLoginAttempts', async () => {
      userCredentialsRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 0,
      });
      userCredentialsRepository.update.mockResolvedValue({});

      await expect(
        service.validateUserCredentials('admin@firma.com', 'WrongPassword'),
      ).rejects.toThrow(UnauthorizedException);

      expect(userCredentialsRepository.update).toHaveBeenCalledWith(mockUser.id, {
        failedLoginAttempts: 1,
        lockedUntil: null,
      });
    });

    it('debería bloquear la cuenta (lockedUntil = 15m) al llegar a 5 intentos fallidos', async () => {
      userCredentialsRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 4,
      });
      userCredentialsRepository.update.mockResolvedValue({});

      await expect(
        service.validateUserCredentials('admin@firma.com', 'WrongPassword'),
      ).rejects.toThrow(UnauthorizedException);

      expect(userCredentialsRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      );
    });

    it('debería rechazar con HTTP 423 Locked con el payload de tiempo restante byte-idéntico', async () => {
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min en el futuro
      userCredentialsRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 5,
        lockedUntil,
      });

      try {
        await service.validateUserCredentials(
          'admin@firma.com',
          'Password123!',
        );
        fail('Debería haber lanzado una excepción');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toEqual(HttpStatus.LOCKED);

        const response = err.getResponse();
        const remainingMs = lockedUntil.getTime() - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        expect(response).toEqual({
          statusCode: HttpStatus.LOCKED,
          error: 'Locked',
          message: `Cuenta bloqueada temporalmente por exceso de intentos fallidos. Reintente en ${remainingMinutes} minutos.`,
          remainingSeconds,
          remainingMinutes,
        });
      }
    });

    it('debería resetear failedLoginAttempts a 0 si la contraseña es correcta', async () => {
      userCredentialsRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 2,
        lockedUntil: null,
      });
      userCredentialsRepository.update.mockResolvedValue({});

      await service.validateUserCredentials('admin@firma.com', 'Password123!');

      expect(userCredentialsRepository.update).toHaveBeenCalledWith(mockUser.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    });

    it('debería migrar el hash bcrypt a argon2 en un login exitoso', async () => {
      const legacyHash = await bcrypt.hash('Password123!', 10);
      userCredentialsRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: legacyHash,
      });
      userCredentialsRepository.update.mockResolvedValue({});

      await service.validateUserCredentials('admin@firma.com', 'Password123!');

      expect(userCredentialsRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          passwordHash: expect.stringMatching(/^\$argon2/),
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      );
    });
  });

  describe('login', () => {
    it('debería retornar accessToken, refreshToken y objeto user con firmaId', async () => {
      refreshTokenRepository.create.mockResolvedValue({});

      const response = await service.login(mockUser);

      expect(response).toHaveProperty('accessToken', 'mock-access-token');
      expect(response).toHaveProperty('refreshToken');
      expect(response.refreshToken).toHaveLength(80); // randomBytes(40).hex
      expect(response.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        firmaId: mockUser.companyId,
      });
      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
    });
  });

  describe('refreshTokens', () => {
    it('debería rechazar con 400 si no se envía refresh token', async () => {
      await expect(service.refreshTokens('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería rotar el refresh token y devolver un nuevo accessToken + refreshToken', async () => {
      const rawToken = 'sample-refresh-token-123';
      const tokenHash = await argon2.hash(rawToken);

      refreshTokenRepository.findActiveWithUser.mockResolvedValue([
        {
          id: 'rt-1',
          userId: mockUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 100000),
          revokedAt: null,
          user: mockUser,
        },
      ]);
      refreshTokenRepository.revoke.mockResolvedValue({});
      refreshTokenRepository.create.mockResolvedValue({});

      const result = await service.refreshTokens(rawToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // Flujo congelado (REQ-F3-03): el refresh escanea con findActiveWithUser
      // (filtro de expiración + include user), NO con findAllActive.
      expect(refreshTokenRepository.findActiveWithUser).toHaveBeenCalledTimes(1);
      expect(refreshTokenRepository.findAllActive).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-1');
      expect(refreshTokenRepository.create).toHaveBeenCalledTimes(1);
    });

    it('debería rechazar con 401 si el token no matchea ningún registro activo', async () => {
      refreshTokenRepository.findActiveWithUser.mockResolvedValue([]);

      await expect(
        service.refreshTokens('token-sin-match'),
      ).rejects.toThrow('Refresh token inválido, expirado o revocado');
    });

    it('debería rechazar con 401 si el usuario asociado está inactivo o eliminado', async () => {
      const rawToken = 'token-de-usuario-inactivo';
      const tokenHash = await argon2.hash(rawToken);

      refreshTokenRepository.findActiveWithUser.mockResolvedValue([
        {
          id: 'rt-3',
          userId: mockUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 100000),
          revokedAt: null,
          user: { ...mockUser, active: false },
        },
      ]);

      await expect(
        service.refreshTokens(rawToken),
      ).rejects.toThrow('Usuario inactivo');
      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('debería responder OK sin escanear si no se envía refresh token', async () => {
      const res = await service.logout('');

      expect(res).toEqual({ message: 'Sesión cerrada correctamente' });
      expect(refreshTokenRepository.findAllActive).not.toHaveBeenCalled();
    });

    it('debería revocar el refresh token marcando revokedAt', async () => {
      const rawToken = 'logout-refresh-token';
      const tokenHash = await argon2.hash(rawToken);

      refreshTokenRepository.findAllActive.mockResolvedValue([
        {
          id: 'rt-2',
          userId: mockUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 100000),
          revokedAt: null,
        },
      ]);
      refreshTokenRepository.revoke.mockResolvedValue({});

      const res = await service.logout(rawToken);

      expect(res).toEqual({ message: 'Sesión cerrada correctamente' });
      // Flujo congelado (REQ-F3-03): el logout escanea TODOS los tokens no
      // revocados (sin filtro de expiración ni include user — byte-idéntico al
      // findMany del legacy), NO findActiveWithUser.
      expect(refreshTokenRepository.findAllActive).toHaveBeenCalledTimes(1);
      expect(refreshTokenRepository.findActiveWithUser).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-2');
    });

    it('debería responder OK si ningún token activo matchea', async () => {
      refreshTokenRepository.findAllActive.mockResolvedValue([]);

      const res = await service.logout('token-sin-match');

      expect(res).toEqual({ message: 'Sesión cerrada correctamente' });
      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    });
  });
});
