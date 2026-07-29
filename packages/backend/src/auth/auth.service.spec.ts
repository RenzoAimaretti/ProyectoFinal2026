import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserRole } from '../../prisma/generated/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'admin@firma.com',
    passwordHash: '',
    role: UserRole.ADMIN,
    companyId: 'company-uuid-1',
    active: true,
    deleted: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash('Password123!');
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
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
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const user = await service.validateUserCredentials('admin@firma.com', 'Password123!');
      expect(user).toBeDefined();
      expect(user.id).toEqual(mockUser.id);
    });

    it('debería rechazar con 401 si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUserCredentials('inexistente@firma.com', 'Password123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debería rechazar con 401 si la contraseña es incorrecta e incrementar failedLoginAttempts', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, failedLoginAttempts: 0 });
      prisma.user.update.mockResolvedValue({});

      await expect(
        service.validateUserCredentials('admin@firma.com', 'WrongPassword'),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: 1,
          lockedUntil: null,
        }),
      });
    });

    it('debería bloquear la cuenta (lockedUntil = 15m) al llegar a 5 intentos fallidos', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, failedLoginAttempts: 4 });
      prisma.user.update.mockResolvedValue({});

      await expect(
        service.validateUserCredentials('admin@firma.com', 'WrongPassword'),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      });
    });

    it('debería rechazar con HTTP 423 Locked si el usuario está bloqueado (lockedUntil > now)', async () => {
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min en el futuro
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 5,
        lockedUntil,
      });

      try {
        await service.validateUserCredentials('admin@firma.com', 'Password123!');
        fail('Debería haber lanzado una excepción');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toEqual(HttpStatus.LOCKED);
        expect(err.getResponse().message).toContain('Cuenta bloqueada temporalmente');
      }
    });

    it('debería resetear failedLoginAttempts a 0 si la contraseña es correcta', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 2,
        lockedUntil: null,
      });
      prisma.user.update.mockResolvedValue({});

      await service.validateUserCredentials('admin@firma.com', 'Password123!');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });
  });

  describe('login', () => {
    it('debería retornar accessToken, refreshToken y objeto user con firmaId', async () => {
      prisma.refreshToken.create.mockResolvedValue({});

      const response = await service.login(mockUser);

      expect(response).toHaveProperty('accessToken', 'mock-access-token');
      expect(response).toHaveProperty('refreshToken');
      expect(response.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        firmaId: mockUser.companyId,
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('debería rotar el refresh token y devolver un nuevo accessToken + refreshToken', async () => {
      const rawToken = 'sample-refresh-token-123';
      const tokenHash = await argon2.hash(rawToken);

      const activeTokenRecord = {
        id: 'rt-1',
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        user: mockUser,
      };

      prisma.refreshToken.findMany.mockResolvedValue([activeTokenRecord]);
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens(rawToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('debería revocar el refresh token marcando revokedAt', async () => {
      const rawToken = 'logout-refresh-token';
      const tokenHash = await argon2.hash(rawToken);

      prisma.refreshToken.findMany.mockResolvedValue([
        {
          id: 'rt-2',
          tokenHash,
          revokedAt: null,
        },
      ]);
      prisma.refreshToken.update.mockResolvedValue({});

      const res = await service.logout(rawToken);

      expect(res).toEqual({ message: 'Sesión cerrada correctamente' });
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-2' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
