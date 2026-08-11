import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountInactiveError, AccountLockedError, AuthenticationFailedError, InvalidInputError } from './domain/errors';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.use-case';
import { ValidateUserCredentialsUseCase } from './application/use-cases/validate-user-credentials.use-case';

@Injectable()
export class AuthService {
  constructor(
    private readonly validateUserCredentialsUseCase: ValidateUserCredentialsUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokensUseCase: RefreshTokensUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  async validateUserCredentials(email: string, password: string) {
    return this.handle(() => this.validateUserCredentialsUseCase.execute(email, password));
  }

  async login(user: any) {
    return this.handle(() => this.loginUseCase.execute(user));
  }

  async refreshTokens(refreshTokenRaw: string) {
    return this.handle(() => this.refreshTokensUseCase.execute(refreshTokenRaw));
  }

  async logout(refreshTokenRaw: string) {
    return this.handle(() => this.logoutUseCase.execute(refreshTokenRaw));
  }

  private async handle<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.translateError(error);
    }
  }

  private translateError(error: unknown): Error {
    if (error instanceof AccountLockedError) {
      throw new HttpException(
        {
          statusCode: HttpStatus.LOCKED,
          error: 'Locked',
          message: error.message,
          remainingSeconds: error.remainingSeconds,
          remainingMinutes: error.remainingMinutes,
        },
        HttpStatus.LOCKED,
      );
    }

    if (error instanceof AuthenticationFailedError || error instanceof AccountInactiveError) {
      return new UnauthorizedException(error.message);
    }

    if (error instanceof InvalidInputError) {
      return new BadRequestException(error.message);
    }

    return new InternalServerErrorException('Error de autenticación');
  }
}
