import { BadRequestException, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountLockedError, AuthenticationFailedError, InvalidInputError } from './domain/errors';
import { AuthService } from './auth.service';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.use-case';
import { ValidateUserCredentialsUseCase } from './application/use-cases/validate-user-credentials.use-case';

describe('AuthService', () => {
  let service: AuthService;
  const validateUseCase = { execute: jest.fn() };
  const loginUseCase = { execute: jest.fn() };
  const refreshUseCase = { execute: jest.fn() };
  const logoutUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ValidateUserCredentialsUseCase, useValue: validateUseCase },
        { provide: LoginUseCase, useValue: loginUseCase },
        { provide: RefreshTokensUseCase, useValue: refreshUseCase },
        { provide: LogoutUseCase, useValue: logoutUseCase },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('delegates credential validation and returns the principal', async () => {
    validateUseCase.execute.mockResolvedValue({
      id: 'user-1',
      email: 'admin@firma.com',
      role: 'ADMIN',
      firmaId: 'company-1',
    });

    await expect(service.validateUserCredentials('admin@firma.com', 'Password123!')).resolves.toEqual({
      id: 'user-1',
      email: 'admin@firma.com',
      role: 'ADMIN',
      firmaId: 'company-1',
    });

    expect(validateUseCase.execute).toHaveBeenCalledWith('admin@firma.com', 'Password123!');
  });

  it('maps locked accounts to the legacy 423 payload', async () => {
    validateUseCase.execute.mockRejectedValue(
      new AccountLockedError('Cuenta bloqueada temporalmente', 600, 600),
    );

    await expect(service.validateUserCredentials('admin@firma.com', 'Password123!')).rejects.toMatchObject({
      status: HttpStatus.LOCKED,
    });

    try {
      await service.validateUserCredentials('admin@firma.com', 'Password123!');
    } catch (error: any) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.LOCKED);
      expect(error.getResponse()).toMatchObject({
        statusCode: HttpStatus.LOCKED,
        error: 'Locked',
        message: 'Cuenta bloqueada temporalmente',
      });
    }
  });

  it('delegates login, refresh and logout flows', async () => {
    loginUseCase.execute.mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref', user: { id: 'user-1' } });
    refreshUseCase.execute.mockResolvedValue({ accessToken: 'new-acc', refreshToken: 'new-ref' });
    logoutUseCase.execute.mockResolvedValue({ message: 'Sesión cerrada correctamente' });

    await expect(service.login({ id: 'user-1' })).resolves.toEqual({
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'user-1' },
    });
    await expect(service.refreshTokens('refresh-token')).resolves.toEqual({
      accessToken: 'new-acc',
      refreshToken: 'new-ref',
    });
    await expect(service.logout('refresh-token')).resolves.toEqual({
      message: 'Sesión cerrada correctamente',
    });

    expect(loginUseCase.execute).toHaveBeenCalledWith({ id: 'user-1' });
    expect(refreshUseCase.execute).toHaveBeenCalledWith('refresh-token');
    expect(logoutUseCase.execute).toHaveBeenCalledWith('refresh-token');
  });

  it('translates invalid refresh inputs into a bad request', async () => {
    refreshUseCase.execute.mockRejectedValue(new InvalidInputError('Refresh token requerido'));

    await expect(service.refreshTokens('')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps authentication failures as unauthorized responses', async () => {
    validateUseCase.execute.mockRejectedValue(new AuthenticationFailedError('Usuario o contraseña incorrectos'));

    await expect(service.validateUserCredentials('admin@firma.com', 'bad')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
