import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería procesar login correctamente', async () => {
    const mockUser = { id: 'u-1', email: 'test@firma.com', role: 'ADMIN', companyId: 'c-1' };
    const mockResult = {
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'u-1', email: 'test@firma.com', role: 'ADMIN', firmaId: 'c-1' },
    };
    authService.login.mockResolvedValue(mockResult);

    const req = { user: mockUser };
    const result = await controller.login(req, { email: 'test@firma.com', password: 'Password123!' });

    expect(authService.login).toHaveBeenCalledWith(mockUser);
    expect(result).toEqual(mockResult);
  });

  it('debería procesar refresh correctamente', async () => {
    const mockResult = { accessToken: 'new-acc', refreshToken: 'new-ref' };
    authService.refreshTokens.mockResolvedValue(mockResult);

    const result = await controller.refresh({ refreshToken: 'valid-ref' });

    expect(authService.refreshTokens).toHaveBeenCalledWith('valid-ref');
    expect(result).toEqual(mockResult);
  });

  it('debería procesar logout correctamente', async () => {
    authService.logout.mockResolvedValue({ message: 'Sesión cerrada correctamente' });

    const result = await controller.logout({ refreshToken: 'valid-ref' });

    expect(authService.logout).toHaveBeenCalledWith('valid-ref');
    expect(result).toEqual({ message: 'Sesión cerrada correctamente' });
  });
});
