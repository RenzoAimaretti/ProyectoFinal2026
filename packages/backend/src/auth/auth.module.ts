import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CLOCK, PASSWORD_HASHER, RANDOM_TOKEN, REFRESH_TOKEN_REPOSITORY, TOKEN_SIGNER, USER_CREDENTIALS_REPOSITORY } from './application/auth.ports';
import { AuthPasswordHasher } from './adapters/outbound/auth-password-hasher';
import { JwtTokenSigner } from './adapters/outbound/jwt-token-signer';
import { RandomTokenGenerator } from './adapters/outbound/random-token.generator';
import { SystemClock } from './adapters/outbound/system-clock';
import { PrismaUserCredentialsRepository } from './adapters/outbound/prisma-user-credentials.repository';
import { PrismaRefreshTokenRepository } from './adapters/outbound/prisma-refresh-token.repository';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.use-case';
import { ValidateUserCredentialsUseCase } from './application/use-cases/validate-user-credentials.use-case';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '15m' },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    { provide: USER_CREDENTIALS_REPOSITORY, useClass: PrismaUserCredentialsRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: PASSWORD_HASHER, useClass: AuthPasswordHasher },
    { provide: TOKEN_SIGNER, useClass: JwtTokenSigner },
    { provide: RANDOM_TOKEN, useClass: RandomTokenGenerator },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: ValidateUserCredentialsUseCase,
      useFactory: (repository: PrismaUserCredentialsRepository, passwordHasher: AuthPasswordHasher, clock: SystemClock) =>
        new ValidateUserCredentialsUseCase(repository, passwordHasher, clock),
      inject: [USER_CREDENTIALS_REPOSITORY, PASSWORD_HASHER, CLOCK],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        refreshTokenRepository: PrismaRefreshTokenRepository,
        passwordHasher: AuthPasswordHasher,
        tokenSigner: JwtTokenSigner,
        randomToken: RandomTokenGenerator,
        clock: SystemClock,
      ) => new LoginUseCase(refreshTokenRepository, passwordHasher, tokenSigner, randomToken, clock),
      inject: [REFRESH_TOKEN_REPOSITORY, PASSWORD_HASHER, TOKEN_SIGNER, RANDOM_TOKEN, CLOCK],
    },
    {
      provide: RefreshTokensUseCase,
      useFactory: (
        refreshTokenRepository: PrismaRefreshTokenRepository,
        passwordHasher: AuthPasswordHasher,
        tokenSigner: JwtTokenSigner,
        randomToken: RandomTokenGenerator,
        clock: SystemClock,
      ) => new RefreshTokensUseCase(refreshTokenRepository, passwordHasher, tokenSigner, randomToken, clock),
      inject: [REFRESH_TOKEN_REPOSITORY, PASSWORD_HASHER, TOKEN_SIGNER, RANDOM_TOKEN, CLOCK],
    },
    {
      provide: LogoutUseCase,
      useFactory: (refreshTokenRepository: PrismaRefreshTokenRepository, passwordHasher: AuthPasswordHasher, clock: SystemClock) =>
        new LogoutUseCase(refreshTokenRepository, passwordHasher, clock),
      inject: [REFRESH_TOKEN_REPOSITORY, PASSWORD_HASHER, CLOCK],
    },
  ],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
